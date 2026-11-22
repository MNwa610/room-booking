package com.example.room_booking.repository;

import com.example.room_booking.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Set;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    boolean existsByRoomIdAndStartTimeLessThanAndEndTimeGreaterThan(
            Long roomId, LocalDateTime end, LocalDateTime start);

    @Query("""
            select distinct b.room.id from Booking b
            where b.startTime < :endTime and b.endTime > :startTime
            """)
    Set<Long> findOccupiedRoomIds(@Param("startTime") LocalDateTime startTime,
                                  @Param("endTime") LocalDateTime endTime);
}
