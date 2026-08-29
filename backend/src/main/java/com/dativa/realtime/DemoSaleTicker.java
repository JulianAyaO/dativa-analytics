package com.dativa.realtime;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "dativa.realtime.demo-publisher", havingValue = "true")
public class DemoSaleTicker {
    private static final List<String> REGIONS = List.of("Caribe", "Andina", "Pacífica", "Orinoquía", "Amazonía");
    private static final List<String> CATEGORIES =
            List.of("Electrónica", "Hogar", "Moda", "Alimentos", "Accesorios");
    private static final List<String> PRODUCTS =
            List.of("Auriculares", "Monitor 27\"", "Chaqueta", "Café premium", "Mochila urbana");
    private static final List<String> SELLERS =
            List.of("Ana Pérez", "Carlos Ruiz", "Lucía Gómez", "Diego Soto");

    private final SalePublisher publisher;
    private final Clock clock;
    private final AtomicInteger sequence = new AtomicInteger();

    public DemoSaleTicker(SalePublisher publisher) {
        this(publisher, Clock.systemUTC());
    }

    DemoSaleTicker(SalePublisher publisher, Clock clock) {
        this.publisher = publisher;
        this.clock = clock;
    }

    @Scheduled(initialDelay = 8_000, fixedDelay = 12_000)
    public void tick() {
        publisher.publish(sample(sequence.getAndIncrement()));
    }

    SaleCreated sample(int index) {
        int quantity = 1 + (index % 3);
        BigDecimal amount = BigDecimal.valueOf(102_900 + (index % 7) * 35_280L);
        return SaleCreated.of(
                "sales",
                Instant.now(clock),
                pick(REGIONS, index),
                pick(CATEGORIES, index + 1),
                pick(PRODUCTS, index + 2),
                pick(SELLERS, index + 3),
                quantity,
                amount);
    }

    private static String pick(List<String> values, int index) {
        return values.get(Math.floorMod(index, values.size()));
    }
}
