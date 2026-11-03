package com.example.room_booking.service;

import com.example.room_booking.repository.RoomRepository;
import com.example.room_booking.entity.Room;
import com.example.room_booking.dto.RoomRequest;
import org.springframework.stereotype.Service;

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

    public Room add(RoomRequest roomRequest) {
        return  roomRepository.save(new Room(null, roomRequest.getName()));
    }
}