package com.fraudlens.event.controller;

import com.fraudlens.event.model.Event;
import com.fraudlens.event.service.impl.KafkaService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/events")
public class IngestController {

    @Autowired
    private KafkaService kafkaService;

    @PostMapping
    public ResponseEntity<Event> ingestEvent(@RequestBody Event event) {
        return ResponseEntity.ok(kafkaService.sendMessage("event-upload", event));

    }
}
