package com.example.room_booking.repository;

import com.example.room_booking.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Set;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    java.util.List<Booking> findByOrganizerIdOrderByStartTimeAsc(Long id);

    java.util.List<Booking> findByRoomIdAndCancelledAtIsNullAndStartTimeLessThanAndEndTimeGreaterThanOrderByStartTimeAsc(
            Long roomId, LocalDateTime end, LocalDateTime start);

    boolean existsByRoomIdAndCancelledAtIsNullAndStartTimeLessThanAndEndTimeGreaterThan(
            Long roomId, LocalDateTime end, LocalDateTime start);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    java.util.Optional<Booking> findByIdAndOrganizerId(Long id, Long organizerId);

    boolean existsByRoomIdAndIdNotAndCancelledAtIsNullAndStartTimeLessThanAndEndTimeGreaterThan(
            Long roomId, Long excludedId, LocalDateTime end, LocalDateTime start);

    @Query("""
            select distinct b.room.id from Booking b
            where b.cancelledAt is null and b.startTime < :endTime and b.endTime > :startTime
            """)
    Set<Long> findOccupiedRoomIds(@Param("startTime") LocalDateTime startTime,
                                  @Param("endTime") LocalDateTime endTime);
}
