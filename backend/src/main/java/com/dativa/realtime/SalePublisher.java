package com.dativa.realtime;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class SalePublisher {
    public static final String TOPIC = "/topic/sales";

    private final SimpMessagingTemplate messaging;

    public SalePublisher(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    public void publish(SaleCreated sale) {
        messaging.convertAndSend(TOPIC, sale);
    }
}
