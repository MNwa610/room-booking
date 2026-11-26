package com.example.room_booking.controller;

import com.example.room_booking.entity.Employee;
import com.example.room_booking.repository.EmployeeRepository;
import com.example.room_booking.service.EmployeeSession;
import com.example.room_booking.service.Passwords;
import jakarta.servlet.http.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@RestController
@RequestMapping("/account")
public class AccountController {
    private final EmployeeRepository employees;
    private final EmployeeSession sessions;

    public AccountController(EmployeeRepository employees, EmployeeSession sessions) {
        this.employees = employees;
        this.sessions = sessions;
    }

    record Registration(@NotBlank @Email @Size(max=200) String email,
                        @NotBlank @Size(min=8,max=128) String password,
                        @NotBlank @Size(max=80) String name, @NotBlank @Size(max=80) String department) {}
    record Login(@NotBlank @Email String email, @NotBlank @Size(max=128) String password) {}
    record Update(@NotBlank @Size(max=80) String name, @NotBlank @Size(max=80) String department,
                  @Size(max=65536) @Pattern(regexp="(?:data:image/jpeg;base64,[A-Za-z0-9+/]+=*)?") String avatar) {}
    record Profile(String name, String email, String department, String avatar) {
        static Profile of(Employee e) { return new Profile(e.getName(), e.getEmail(), e.getDepartment(), e.getAvatar()); }
    }

    @PostMapping("/register")
    Profile register(@Valid @RequestBody Registration input, HttpServletRequest request) {
        var employee = new Employee(input.email().strip().toLowerCase(Locale.ROOT), input.name(),
                input.department(), Passwords.encode(input.password()));
        try {
            employees.saveAndFlush(employee);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
        return signIn(employee, request);
    }

    @PostMapping("/login")
    Profile login(@Valid @RequestBody Login input, HttpServletRequest request) {
        var employee = employees.findByEmail(input.email().strip().toLowerCase(Locale.ROOT))
                .filter(e -> Passwords.matches(input.password(), e.credential()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
        return signIn(employee, request);
    }

    private Profile signIn(Employee employee, HttpServletRequest request) {
        var session = request.getSession();
        request.changeSessionId();
        session.setAttribute("employeeId", employee.getId());
        return Profile.of(employee);
    }

    @GetMapping
    Profile profile(HttpSession session) { return Profile.of(sessions.require(session)); }

    @PutMapping
    Profile update(@Valid @RequestBody Update input, HttpSession session) {
        var employee = sessions.require(session);
        employee.update(input.name(), input.department());
        if (input.avatar() != null) employee.setAvatar(input.avatar().isEmpty() ? null : input.avatar());
        return Profile.of(employees.save(employee));
    }

    @PostMapping(value="/logout", consumes="application/json")
    void logout(HttpSession session) { session.invalidate(); }
}
