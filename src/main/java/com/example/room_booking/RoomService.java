package com.example.room_booking;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class RoomService {

    private final RoomRepository roomRepository;

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    public String roomFree() {
        return "комната свободна";
    }

    public List<Room> findAll() {
        return roomRepository.findAll();
    }

    public Room add(String name) {
        return  roomRepository.save(new Room(null, name));
    }
}