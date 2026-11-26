package com.example.room_booking.service;

import com.example.room_booking.entity.Employee;
import com.example.room_booking.repository.EmployeeRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class EmployeeSession {
    private final EmployeeRepository employees;

    public EmployeeSession(EmployeeRepository employees) { this.employees = employees; }

    public Employee require(HttpSession session) {
        Long id = (Long) session.getAttribute("employeeId");
        if (id == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        return employees.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}
