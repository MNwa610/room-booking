package com.example.room_booking.service;

import com.example.room_booking.repository.RoomRepository;
import com.example.room_booking.repository.BookingRepository;
import com.example.room_booking.entity.Room;
import com.example.room_booking.dto.RoomAvailability;
import com.example.room_booking.dto.RoomRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

@Service
public class RoomService {

    private final RoomRepository roomRepository;
    private final BookingRepository bookingRepository;

    public RoomService(RoomRepository roomRepository, BookingRepository bookingRepository) {
        this.roomRepository = roomRepository;
        this.bookingRepository = bookingRepository;
    }

    public String roomFree() {
        return "комната свободна";
    }

    public List<Room> findAll() {
        return roomRepository.findAll();
    }

    public List<RoomAvailability> findAvailability(LocalDateTime startTime, LocalDateTime endTime) {
        if (!endTime.isAfter(startTime)) {
            throw new IllegalArgumentException("Конец интервала должен быть позже начала");
        }

        List<Room> rooms = findAll();
        Set<Long> occupiedRoomIds = bookingRepository.findOccupiedRoomIds(startTime, endTime);
        return rooms.stream()
                .map(room -> new RoomAvailability(room.getId(), room.getName(),
                        !occupiedRoomIds.contains(room.getId())))
                .toList();
    }

    public Room add(RoomRequest roomRequest) {
        return  roomRepository.save(new Room(null, roomRequest.getName()));
    }
}
