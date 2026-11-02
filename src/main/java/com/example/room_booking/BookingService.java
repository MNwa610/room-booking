package com.example.room_booking;

import org.springframework.stereotype.Service;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;

    public BookingService(BookingRepository bookingRepository, RoomRepository roomRepository) {
        this.bookingRepository = bookingRepository;
        this.roomRepository = roomRepository;
    }

    public Booking create(BookingRequest request) {
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new IllegalArgumentException("Конец брони должен быть позже начала");
        }

        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new IllegalArgumentException("Комната не найдена: " + request.getRoomId()));

        boolean conflict = bookingRepository.existsByRoomIdAndStartTimeLessThanAndEndTimeGreaterThan(
                request.getRoomId(), request.getEndTime(), request.getStartTime());
        if (conflict) {
            throw new BookingConflictException("Комната занята в это время");
        }

        Booking booking = new Booking(room, request.getStartTime(), request.getEndTime());
        return bookingRepository.save(booking);
    }
}