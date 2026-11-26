package com.example.room_booking.service;

import com.example.room_booking.dto.BookingRequest;
import com.example.room_booking.entity.Booking;
import com.example.room_booking.entity.Room;
import com.example.room_booking.entity.Employee;
import com.example.room_booking.exception.BookingConflictException;
import com.example.room_booking.exception.RoomNotFoundException;
import com.example.room_booking.repository.BookingRepository;
import com.example.room_booking.repository.RoomRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;

    public BookingService(BookingRepository bookingRepository, RoomRepository roomRepository) {
        this.bookingRepository = bookingRepository;
        this.roomRepository = roomRepository;
    }

    @Transactional
    public Booking create(BookingRequest request, Employee organizer) {
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new IllegalArgumentException("Конец брони должен быть позже начала");
        }

        Room room = roomRepository.findByIdForUpdate(request.getRoomId())
                .orElseThrow(() -> new RoomNotFoundException(request.getRoomId()));

        boolean conflict = bookingRepository.existsByRoomIdAndCancelledAtIsNullAndStartTimeLessThanAndEndTimeGreaterThan(
                request.getRoomId(), request.getEndTime(), request.getStartTime());
        if (conflict) {
            throw new BookingConflictException("Комната занята в это время");
        }

        var booking = new Booking(room, request.getStartTime(), request.getEndTime());
        booking.assign(organizer, request.getPurpose());
        return bookingRepository.save(booking);
    }

    private Booking ownedBooking(Long id, Employee employee) {
        return bookingRepository.findByIdAndOrganizerId(id, employee.getId())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND));
    }

    @Transactional
    public void update(Long id, BookingRequest request, Employee employee) {
        Booking booking = ownedBooking(id, employee);
        if (booking.getCancelledAt() != null) throw new BookingConflictException("Встреча уже отменена");
        Long roomId = booking.getRoom().getId();
        if (!roomId.equals(request.getRoomId()) || !request.getEndTime().isAfter(request.getStartTime())) {
            throw new IllegalArgumentException("Проверь комнату и интервал встречи");
        }
        roomRepository.findByIdForUpdate(roomId).orElseThrow(() -> new RoomNotFoundException(roomId));
        if (bookingRepository.existsByRoomIdAndIdNotAndCancelledAtIsNullAndStartTimeLessThanAndEndTimeGreaterThan(
                roomId, id, request.getEndTime(), request.getStartTime())) {
            throw new BookingConflictException("Комната занята в это время");
        }
        booking.reschedule(request.getStartTime(), request.getEndTime(), request.getPurpose());
    }

    @Transactional
    public void cancel(Long id, Employee employee) {
        ownedBooking(id, employee).cancel();
    }
}
