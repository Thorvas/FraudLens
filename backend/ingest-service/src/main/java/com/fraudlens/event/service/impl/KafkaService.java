package com.fraudlens.event.service.impl;

import com.fraudlens.event.model.Event;
import com.fraudlens.event.service.IKafkaService;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class KafkaService implements IKafkaService {

    private final KafkaTemplate<String, Event> kafkaTemplate;

    public KafkaService(KafkaTemplate<String, Event> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    @Override
    public Event sendMessage(String topic, Event message) {
        kafkaTemplate.send(topic, message);
        return message; // Return the message or handle asynchronously
    }
}
