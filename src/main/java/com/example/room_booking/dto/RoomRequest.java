package com.example.room_booking.dto;

import jakarta.validation.constraints.NotBlank;

public class RoomRequest {
    @NotBlank
    private String name;

    public RoomRequest(){

    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
