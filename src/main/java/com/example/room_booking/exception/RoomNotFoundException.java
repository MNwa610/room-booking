package com.example.room_booking.exception;

public class RoomNotFoundException extends RuntimeException {

    public RoomNotFoundException(Long id) {
        super("Комната не найдена: " + id);
    }
}