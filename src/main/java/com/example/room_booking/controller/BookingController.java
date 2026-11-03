package com.example.room_booking.controller;

import com.example.room_booking.entity.Booking;
import com.example.room_booking.dto.BookingRequest;
import com.example.room_booking.service.BookingService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/bookings")
public class BookingController {

    private final BookingService bookingService;

    public BookingController(BookingService bookingService) {
        this.bookingService = bookingService;
    }

    @PostMapping
    public Booking create(@Valid @RequestBody BookingRequest bookingRequest) {
        return bookingService.create(bookingRequest);
    }
}