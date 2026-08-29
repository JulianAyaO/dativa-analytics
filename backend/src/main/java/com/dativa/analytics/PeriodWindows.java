package com.dativa.analytics;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class PeriodWindows {
    private static final String[] MONTHS = {
        "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"
    };

    private final Clock clock;

    public PeriodWindows() {
        this(Clock.systemUTC());
    }

    PeriodWindows(Clock clock) {
        this.clock = clock;
    }

    public LocalDate today() {
        return LocalDate.now(clock);
    }

    public Range current(String period) {
        LocalDate today = today();
        return switch (period) {
            case "last_7_days" -> daily(today.minusDays(6), today.plusDays(1));
            case "last_30_days" -> daily(today.minusDays(29), today.plusDays(1));
            case "last_12_months" -> monthly(YearMonth.from(today).minusMonths(11), YearMonth.from(today).plusMonths(1));
            default -> throw new InvalidAnalyticsQueryException("Periodo no soportado");
        };
    }

    public Range previous(Range current) {
        long days = current.toExclusive().toEpochMilli() - current.fromInclusive().toEpochMilli();
        Instant to = current.fromInclusive();
        Instant from = Instant.ofEpochMilli(to.toEpochMilli() - days);
        return new Range(from, to);
    }

    public List<BucketKey> timeKeys(String period, Range range) {
        List<BucketKey> keys = new ArrayList<>();
        if ("last_12_months".equals(period)) {
            YearMonth cursor = YearMonth.from(range.fromInclusive().atZone(ZoneOffset.UTC));
            YearMonth end = YearMonth.from(range.toExclusive().atZone(ZoneOffset.UTC));
            while (cursor.isBefore(end)) {
                keys.add(new BucketKey(
                        cursor.toString(),
                        MONTHS[cursor.getMonthValue() - 1] + " " + String.valueOf(cursor.getYear()).substring(2)));
                cursor = cursor.plusMonths(1);
            }
            return keys;
        }

        LocalDate cursor = range.fromInclusive().atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate end = range.toExclusive().atZone(ZoneOffset.UTC).toLocalDate();
        while (cursor.isBefore(end)) {
            keys.add(new BucketKey(
                    cursor.toString(), cursor.getDayOfMonth() + " " + MONTHS[cursor.getMonthValue() - 1]));
            cursor = cursor.plusDays(1);
        }
        return keys;
    }

    private static Range daily(LocalDate from, LocalDate toExclusive) {
        return new Range(from.atStartOfDay().toInstant(ZoneOffset.UTC), toExclusive.atStartOfDay().toInstant(ZoneOffset.UTC));
    }

    private static Range monthly(YearMonth from, YearMonth toExclusive) {
        return new Range(
                from.atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC),
                toExclusive.atDay(1).atStartOfDay().toInstant(ZoneOffset.UTC));
    }

    public record Range(Instant fromInclusive, Instant toExclusive) {}

    public record BucketKey(String key, String label) {}
}
