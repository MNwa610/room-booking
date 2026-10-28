package com.example.room_booking;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HelloController {

    private final RoomService roomService;

    public HelloController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping("/hello")
    public String hello(@RequestParam(defaultValue = "гость") String name) {
        return "Hello, " + name + ". " + roomService.RoomFree() + "!";
    }
}