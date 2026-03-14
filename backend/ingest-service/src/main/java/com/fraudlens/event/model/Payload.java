package com.fraudlens.event.model;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;

import java.util.HashMap;

public class Payload extends HashMap<String, Object> {

    @JsonAnyGetter
    public HashMap<String, Object> getProperties() {
        return this;
    }

    @JsonAnySetter
    public void setProperty(String key, Object value) {
        this.put(key, value);
    }
}
