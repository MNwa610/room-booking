package com.example.room_booking.config;

import com.example.room_booking.entity.Room;
import com.example.room_booking.repository.RoomRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
class FloorRooms {

    @Bean
    ApplicationRunner seedFloorRooms(RoomRepository rooms) {
        return args -> {
            List<String> names = List.of("Атлас", "Меридиан", "Горизонт", "Студия", "Библиотека");
            List<String> existingNames = rooms.findAll().stream().map(Room::getName).toList();
            rooms.saveAll(names.stream()
                    .filter(name -> !existingNames.contains(name))
                    .map(name -> new Room(null, name))
                    .toList());
        };
    }
}
