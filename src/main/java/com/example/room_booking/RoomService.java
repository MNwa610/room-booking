package com.example.room_booking;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class RoomService {

    private final List<Room> rooms = new ArrayList<>();
    private long nextId = 1;

    public String roomFree() {
        return "комната свободна";
    }

    public List<Room> findAll() {
        return rooms;
    }

    public Room add(Room room) {
        room.setId(nextId++);
        rooms.add(room);
        return room;
    }
}