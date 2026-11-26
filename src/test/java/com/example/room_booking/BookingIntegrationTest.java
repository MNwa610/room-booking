package com.example.room_booking;

import com.jayway.jsonpath.JsonPath;
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

    private org.springframework.mock.web.MockHttpSession loggedIn;

    private org.springframework.mock.web.MockHttpSession employeeSession() throws Exception {
        if (loggedIn == null) {
            var result = mockMvc.perform(post("/account/register").contentType(MediaType.APPLICATION_JSON)
                    .content("""
                            {"email":"demo@example.org","name":"Анна","department":"ИТ","password":"test-pass123"}
                            """)).andExpect(status().isOk()).andReturn();
            loggedIn = (org.springframework.mock.web.MockHttpSession) result.getRequest().getSession();
        }
        return loggedIn;
    }

    @Test
    void guestCannotReadEmployeeMeetings() throws Exception {
        mockMvc.perform(get("/bookings/mine")).andExpect(status().isUnauthorized());
    }

    @Test
    void meetingsBelongToTheOrganizerAndKeepTheDepartmentAtBookingTime() throws Exception {
        Number roomId = JsonPath.read(createRoom("Атлас"), "$.id");
        var session = employeeSession();
        mockMvc.perform(post("/bookings").session(session).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"roomId":%s,"purpose":"Планирование","startTime":"2027-03-01T10:00","endTime":"2027-03-01T11:00"}
                                """.formatted(roomId)))
                .andExpect(status().isOk());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/account")
                        .session(session).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Анна П.","department":"Дизайн"}
                                """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.department").value("Дизайн"));
        mockMvc.perform(post("/account/logout").session(session).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isOk());
        var signedIn = mockMvc.perform(post("/account/login").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"DEMO@example.org","password":"test-pass123"}
                                """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Анна П."))
                .andReturn().getRequest().getSession();
        mockMvc.perform(get("/bookings/mine").session((org.springframework.mock.web.MockHttpSession) signedIn))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].purpose").value("Планирование"))
                .andExpect(jsonPath("$[0].department").value("ИТ"));

        var colleague = mockMvc.perform(post("/account/register").contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"other@example.org","name":"Другой","department":"Продажи","password":"test-pass456"}
                                """)).andExpect(status().isOk()).andReturn().getRequest().getSession();
        var other = (org.springframework.mock.web.MockHttpSession) colleague;
        mockMvc.perform(get("/bookings/mine").session(other)).andExpect(jsonPath("$").isEmpty());
        mockMvc.perform(get("/bookings/room").session(other).param("roomId", roomId.toString())
                        .param("startTime","2027-03-01T10:15").param("endTime","2027-03-01T10:45"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].department").value("ИТ"));
    }

    @Test
    void organizerCanMoveAndReleaseBookingWithoutOverwritingConflicts() throws Exception {
        Number room = JsonPath.read(createRoom("Переговорная"), "$.id");
        String slot = """
                {"roomId":%s,"purpose":"Встреча","startTime":"2030-06-01T10:00","endTime":"2030-06-01T11:00"}
                """.formatted(room);
        var owner = employeeSession();
        var first = mockMvc.perform(post("/bookings").session(owner).contentType(MediaType.APPLICATION_JSON).content(slot))
                .andExpect(status().isOk()).andReturn();
        Number id = JsonPath.read(first.getResponse().getContentAsString(), "$.id");
        String next = slot.replace("T11:00", "T12:00").replace("T10:00", "T11:00");
        mockMvc.perform(post("/bookings").session(owner).contentType(MediaType.APPLICATION_JSON).content(next))
                .andExpect(status().isOk());
        var update = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/bookings/{id}", id);
        mockMvc.perform(update.session(owner).contentType(MediaType.APPLICATION_JSON).content(next))
                .andExpect(status().isConflict());
        var other = mockMvc.perform(post("/account/register").contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"another@example.org","name":"Борис","department":"ИТ","password":"test-pass456"}
                        """)).andReturn().getRequest().getSession();
        var colleague = (org.springframework.mock.web.MockHttpSession) other;
        mockMvc.perform(update.session(colleague).contentType(MediaType.APPLICATION_JSON).content(slot))
                .andExpect(status().isNotFound());
        var cancel = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/bookings/{id}", id);
        mockMvc.perform(cancel.session(colleague)).andExpect(status().isNotFound());
        mockMvc.perform(update.session(owner).contentType(MediaType.APPLICATION_JSON).content(slot.replace("T10:00", "T09:30")))
                .andExpect(status().isOk());
        mockMvc.perform(cancel.session(owner)).andExpect(status().isOk());
        mockMvc.perform(get("/bookings/mine").session(owner))
                .andExpect(jsonPath("$[?(@.id == %s)].cancelledAt".formatted(id)).isNotEmpty());
        mockMvc.perform(get("/bookings/room").session(owner).param("roomId", room.toString())
                .param("startTime", "2030-06-01T10:00").param("endTime", "2030-06-01T11:00"))
                .andExpect(jsonPath("$").isEmpty());
        mockMvc.perform(post("/bookings").session(owner).contentType(MediaType.APPLICATION_JSON).content(slot))
                .andExpect(status().isOk());
    }

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
                .andExpect(jsonPath("$[?(@.name == 'Переговорка 1')]").isNotEmpty());
    }

    @Test
    void floorRoomsAreAvailableOnOrdinaryStartup() throws Exception {
        var result = mockMvc.perform(get("/rooms/availability")
                .param("startTime", "2030-06-01T10:00").param("endTime", "2030-06-01T11:00"))
                .andExpect(status().isOk());
        for (String name : java.util.List.of("Атлас", "Меридиан", "Горизонт", "Студия", "Библиотека")) {
            result.andExpect(jsonPath("$[?(@.name == '%s' && @.available == true)]".formatted(name))
                    .value(org.hamcrest.Matchers.hasSize(1)));
        }
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
        mockMvc.perform(post("/bookings").session(employeeSession())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"purpose\":\"Встреча\",\"roomId\":999,\"startTime\":\"2026-11-03T10:00:00\",\"endTime\":\"2026-11-03T11:00:00\"}"))
                .andExpect(status().isNotFound());
    }

    @Test
    void returnsConflictForOverlappingBooking() throws Exception {
        Number roomId = JsonPath.read(createRoom("Переговорка 1"), "$.id");

        mockMvc.perform(post("/bookings").session(employeeSession())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"purpose\":\"Встреча\",\"roomId\":%s,\"startTime\":\"2026-11-03T10:00:00\",\"endTime\":\"2026-11-03T11:00:00\"}".formatted(roomId)))
                .andExpect(status().isOk());

        mockMvc.perform(post("/bookings").session(employeeSession())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"purpose\":\"Встреча\",\"roomId\":%s,\"startTime\":\"2026-11-03T10:30:00\",\"endTime\":\"2026-11-03T11:30:00\"}".formatted(roomId)))
                .andExpect(status().isConflict());
    }

    @Test
    void reportsAvailabilityForOverlappingAndAdjacentIntervals() throws Exception {
        Number roomId = JsonPath.read(createRoom("Alpha"), "$.id");
        createRoom("Beta");

        mockMvc.perform(post("/bookings").session(employeeSession())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"purpose":"Встреча","roomId":%s,"startTime":"2026-11-03T10:00:00","endTime":"2026-11-03T11:00:00"}
                                """.formatted(roomId)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/rooms/availability")
                        .param("startTime", "2026-11-03T10:30:00")
                        .param("endTime", "2026-11-03T11:30:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == 'Alpha' && @.available == false)]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.name == 'Beta' && @.available == true)]").isNotEmpty());

        mockMvc.perform(get("/rooms/availability")
                        .param("startTime", "2026-11-03T11:00:00")
                        .param("endTime", "2026-11-03T12:00:00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.available == false)]").isEmpty());
    }

    @Test
    void rejectsAnEmptyAvailabilityInterval() throws Exception {
        mockMvc.perform(get("/rooms/availability")
                        .param("startTime", "2026-11-03T10:00:00")
                        .param("endTime", "2026-11-03T10:00:00"))
                .andExpect(status().isBadRequest());
    }
}
