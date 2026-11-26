package com.example.room_booking;

import com.example.room_booking.dto.BookingRequest;
import com.example.room_booking.entity.Booking;
import com.example.room_booking.entity.Room;
import com.example.room_booking.exception.BookingConflictException;
import com.example.room_booking.exception.RoomNotFoundException;
import com.example.room_booking.repository.BookingRepository;
import com.example.room_booking.repository.RoomRepository;
import com.example.room_booking.service.BookingService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private RoomRepository roomRepository;

    @InjectMocks
    private BookingService bookingService;

    private BookingRequest request(LocalDateTime start, LocalDateTime end) {
        BookingRequest r = new BookingRequest();
        r.setRoomId(1L);
        r.setPurpose("Планирование");
        r.setStartTime(start);
        r.setEndTime(end);
        return r;
    }

    private Booking create(BookingRequest input) {
        return bookingService.create(input, new com.example.room_booking.entity.Employee(
                "test@example.org", "Анна", "ИТ", "unused"));
    }

    @Test
    void createsBookingWhenRoomIsFree() {
        Room room = new Room(1L, "Переговорка 1");
        when(roomRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(room));
        when(bookingRepository.existsByRoomIdAndCancelledAtIsNullAndStartTimeLessThanAndEndTimeGreaterThan(
                anyLong(), any(), any())).thenReturn(false);
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        Booking result = create(
                request(LocalDateTime.of(2026, 11, 3, 10, 0), LocalDateTime.of(2026, 11, 3, 11, 0)));

        assertSame(room, result.getRoom());
    }

    @Test
    void throwsConflictWhenRoomIsBusy() {
        Room room = new Room(1L, "Переговорка 1");
        when(roomRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(room));
        when(bookingRepository.existsByRoomIdAndCancelledAtIsNullAndStartTimeLessThanAndEndTimeGreaterThan(
                anyLong(), any(), any())).thenReturn(true);

        assertThrows(BookingConflictException.class, () -> create(
                request(LocalDateTime.of(2026, 11, 3, 10, 30), LocalDateTime.of(2026, 11, 3, 11, 30))));
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void throwsNotFoundWhenRoomDoesNotExist() {
        when(roomRepository.findByIdForUpdate(1L)).thenReturn(Optional.empty());

        assertThrows(RoomNotFoundException.class, () -> create(
                request(LocalDateTime.of(2026, 11, 3, 10, 0), LocalDateTime.of(2026, 11, 3, 11, 0))));
    }

    @Test
    void rejectsEndBeforeStart() {
        assertThrows(IllegalArgumentException.class, () -> create(
                request(LocalDateTime.of(2026, 11, 3, 11, 0), LocalDateTime.of(2026, 11, 3, 10, 0))));
    }
}