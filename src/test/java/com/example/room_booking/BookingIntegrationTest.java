package com.example.room_booking;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BookingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private String createRoom(String name) throws Exception {
        return mockMvc.perform(post("/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\"}"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    @Test
    void createsRoomAndReturnsItInList() throws Exception {
        mockMvc.perform(post("/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Переговорка 1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Переговорка 1"));

        mockMvc.perform(get("/rooms"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Переговорка 1"));
    }

    @Test
    void rejectsRoomWithBlankName() throws Exception {
        mockMvc.perform(post("/rooms")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.name").exists());
    }

    @Test
    void returnsNotFoundForUnknownRoom() throws Exception {
        mockMvc.perform(post("/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roomId\":999,\"startTime\":\"2026-11-03T10:00:00\",\"endTime\":\"2026-11-03T11:00:00\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void returnsConflictForOverlappingBooking() throws Exception {
        createRoom("Переговорка 1");

        mockMvc.perform(post("/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roomId\":1,\"startTime\":\"2026-11-03T10:00:00\",\"endTime\":\"2026-11-03T11:00:00\"}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"roomId\":1,\"startTime\":\"2026-11-03T10:30:00\",\"endTime\":\"2026-11-03T11:30:00\"}"))
                .andExpect(status().isConflict());
    }
}