package com.example.room_booking.controller;

import com.example.room_booking.dto.BookingRequest;
import com.example.room_booking.entity.Booking;
import com.example.room_booking.repository.BookingRepository;
import com.example.room_booking.service.*;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/bookings")
public class BookingController {
    private final BookingService service;
    private final BookingRepository bookings;
    private final EmployeeSession sessions;

    public BookingController(BookingService service, BookingRepository bookings, EmployeeSession sessions) {
        this.service = service;
        this.bookings = bookings;
        this.sessions = sessions;
    }

    @PostMapping
    public Booking create(@Valid @RequestBody BookingRequest input, HttpSession session) {
        return service.create(input, sessions.require(session));
    }

    @PutMapping("/{id}")
    void update(@PathVariable Long id, @Valid @RequestBody BookingRequest input, HttpSession session) {
        service.update(id, input, sessions.require(session));
    }

    @DeleteMapping("/{id}")
    void cancel(@PathVariable Long id, HttpSession session) {
        service.cancel(id, sessions.require(session));
    }

    record Meeting(Long id, Long roomId, boolean mine, String room, String department, String purpose, LocalDateTime cancelledAt, LocalDateTime startTime, LocalDateTime endTime) {
        static Meeting of(Booking b, com.example.room_booking.entity.Employee employee) {
            return new Meeting(b.getId(), b.getRoom().getId(), b.ownedBy(employee), b.getRoom().getName(), b.getDepartment(), b.getPurpose(), b.getCancelledAt(), b.getStartTime(), b.getEndTime());
        }
    }

    @GetMapping("/mine")
    List<Meeting> mine(HttpSession session) {
        var employee = sessions.require(session);
        return bookings.findByOrganizerIdOrderByStartTimeAsc(employee.getId())
                .stream().map(b -> Meeting.of(b, employee)).toList();
    }

    @GetMapping("/room")
    List<Meeting> room(@RequestParam Long roomId, @RequestParam LocalDateTime startTime,
                       @RequestParam LocalDateTime endTime, HttpSession session) {
        var employee = sessions.require(session);
        if (!endTime.isAfter(startTime)) throw new IllegalArgumentException("Некорректный интервал");
        return bookings.findByRoomIdAndCancelledAtIsNullAndStartTimeLessThanAndEndTimeGreaterThanOrderByStartTimeAsc(roomId,endTime,startTime)
                .stream().map(b -> Meeting.of(b, employee)).toList();
    }
}
