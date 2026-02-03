package com.example.scheduleservice.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
public class ScheduleController {

    @GetMapping("/api/schedules")
    public ResponseEntity<List<Map<String, String>>> getSchedules() {
        List<Map<String, String>> schedules = List.of(
                Map.of("id", "1", "title", "Daily Standup", "time", "09:00"),
                Map.of("id", "2", "title", "Planning", "time", "10:00")
        );
        return ResponseEntity.ok(schedules);
    }
}
