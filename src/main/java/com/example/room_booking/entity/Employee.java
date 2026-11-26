package com.example.room_booking.entity;

import jakarta.persistence.*;

@Entity
public class Employee {
    @Id @GeneratedValue
    private Long id;
    @Column(nullable = false, unique = true)
    private String email;
    private String name;
    private String department;
    private String credential;
    @Column(length = 65536)
    private String avatar;

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    protected Employee() {}

    public Employee(String email, String name, String department, String credential) {
        this.email = email;
        this.credential = credential;
        update(name, department);
    }

    public void update(String name, String department) {
        this.name = name.strip();
        this.department = department.strip();
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getName() { return name; }
    public String getDepartment() { return department; }
    public String credential() { return credential; }
}
