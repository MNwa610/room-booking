package com.example.room_booking;

import org.springframework.stereotype.Service;

@Service
public class RoomService {
    public String RoomFree(){
        return "комната свободна";
    }

}
