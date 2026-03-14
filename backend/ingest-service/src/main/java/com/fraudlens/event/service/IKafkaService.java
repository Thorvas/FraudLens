package com.fraudlens.event.service;

import com.fraudlens.event.model.Event;

public interface IKafkaService {

    Event sendMessage(String topic, Event value);

}
