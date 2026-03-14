package com.fraudlens.event.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fraudlens.event.enums.EventType;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@RequiredArgsConstructor
@Getter
@Setter
public class Event {

    private EventType eventType;
    private Instant occurredAt;
    private Long accountId;
    private Payload payload;
    
    @JsonProperty("isFraud")
    @Getter(onMethod_ = @JsonIgnore)
    private boolean isFraud;
}
