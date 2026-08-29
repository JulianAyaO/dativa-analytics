package com.dativa.realtime;

import static org.assertj.core.api.Assertions.assertThat;

import static org.mockito.Mockito.mock;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class DemoSaleTickerTest {
    @Test
    void buildsATypedSaleCreatedPayload() {
        DemoSaleTicker ticker = new DemoSaleTicker(
                mock(SalePublisher.class), Clock.fixed(Instant.parse("2026-08-24T12:00:00Z"), ZoneOffset.UTC));

        SaleCreated sale = ticker.sample(0);

        assertThat(sale.type()).isEqualTo("SaleCreated");
        assertThat(sale.dataset()).isEqualTo("sales");
        assertThat(sale.region()).isEqualTo("Caribe");
        assertThat(sale.occurredAt()).isEqualTo(Instant.parse("2026-08-24T12:00:00Z"));
        assertThat(sale.quantity()).isPositive();
    }
}
