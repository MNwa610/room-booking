package com.example.room_booking.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @ManyToOne
    private Room room;

    @ManyToOne(fetch = FetchType.LAZY)
    private Employee organizer;
    private String department;
    private String purpose;
    private LocalDateTime cancelledAt;

    public LocalDateTime getCancelledAt() { return cancelledAt; }

    public void cancel() {
        if (cancelledAt == null) cancelledAt = LocalDateTime.now();
    }

    public void assign(Employee organizer, String purpose) {
        this.organizer = organizer;
        this.department = organizer.getDepartment();
        this.purpose = purpose.strip();
    }

    public boolean ownedBy(Employee employee) {
        return organizer != null && organizer.getId().equals(employee.getId());
    }

    public void reschedule(LocalDateTime start, LocalDateTime end, String purpose) {
        this.startTime = start;
        this.endTime = end;
        this.purpose = purpose.strip();
    }

    public String getDepartment() { return department; }
    public String getPurpose() { return purpose; }

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    public Booking(){

    }

    public Booking(Room room,LocalDateTime startTime, LocalDateTime endTime) {
        this.room = room;
        this.startTime = startTime;
        this.endTime = endTime;
    }

    public Long getId() {
        return id;
    }

    public Room getRoom() {
        return room;
    }

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

}

