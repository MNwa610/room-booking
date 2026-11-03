package com.example.room_booking.controller;

import com.example.room_booking.entity.Room;
import com.example.room_booking.dto.RoomRequest;
import com.example.room_booking.service.RoomService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping
    public List<Room> findAll() {
        return roomService.findAll();
    }

    @PostMapping
    public Room add(@Valid @RequestBody RoomRequest roomRequest) {
        return roomService.add(roomRequest);
    }
}