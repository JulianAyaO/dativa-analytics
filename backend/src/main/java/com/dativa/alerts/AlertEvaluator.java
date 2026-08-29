package com.dativa.alerts;

import com.dativa.analytics.AnalyticsQueryService;
import com.dativa.analytics.dto.WidgetQueryRequest;
import com.dativa.analytics.dto.WidgetQueryRequest.DashboardFiltersRequest;
import com.dativa.analytics.dto.WidgetQueryRequest.WidgetConfigRequest;
import com.dativa.analytics.dto.WidgetResultResponse;
import com.dativa.notifications.NotificationService;
import java.time.Instant;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class AlertEvaluator {
    private static final Logger log = LoggerFactory.getLogger(AlertEvaluator.class);

    private final AlertRepository alerts;
    private final AnalyticsQueryService analytics;
    private final NotificationService notifications;

    public AlertEvaluator(
            AlertRepository alerts, AnalyticsQueryService analytics, NotificationService notifications) {
        this.alerts = alerts;
        this.analytics = analytics;
        this.notifications = notifications;
    }

    @Scheduled(initialDelay = 30_000, fixedDelay = 300_000)
    @Transactional
    public void tick() {
        Instant now = Instant.now();
        for (AlertEntity alert : alerts.findByActiveTrue()) {
            try {
                evaluate(alert, now);
            } catch (RuntimeException exception) {
                log.warn("No se pudo evaluar la alerta {}", alert.getId(), exception);
            }
        }
    }

    private void evaluate(AlertEntity alert, Instant now) {
        if (AlertConditions.recentlyFired(alert.getLastFiredAt(), alert.getFrequencyMinutes(), now)) {
            return;
        }
        WidgetResultResponse result = analytics.execute(queryFor(alert));
        if (!"ready".equals(result.status())) {
            return;
        }
        Double value = number(result.data(), "value");
        Double changePct = number(result.data(), "changePct");
        if (value == null || !AlertConditions.matches(alert.getCondition(), alert.getThreshold(), value, changePct)) {
            return;
        }
        alert.setLastFiredAt(now);
        alerts.save(alert);
        notifications.broadcast("alert_fired", "Alerta activada", alert.getName());
    }

    private static WidgetQueryRequest queryFor(AlertEntity alert) {
        return new WidgetQueryRequest(
                "kpi",
                new WidgetConfigRequest(alert.getDataset(), alert.getMetric(), null, alert.getPeriod(), null),
                new DashboardFiltersRequest(
                        alert.getPeriod(),
                        alert.getRegion(),
                        alert.getCategory(),
                        alert.getProduct(),
                        alert.getSeller()));
    }

    private static Double number(Object data, String key) {
        if (!(data instanceof Map<?, ?> map)) {
            return null;
        }
        Object value = map.get(key);
        return value instanceof Number number ? number.doubleValue() : null;
    }
}
