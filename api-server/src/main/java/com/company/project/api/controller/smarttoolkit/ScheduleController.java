package com.company.project.api.controller.smarttoolkit;

import java.util.HashMap;

import java.util.List;

import java.util.Map;

import org.springframework.data.domain.Page;

import org.springframework.data.domain.PageRequest;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.DeleteMapping;

import org.springframework.web.bind.annotation.GetMapping;

import org.springframework.web.bind.annotation.PathVariable;

import org.springframework.web.bind.annotation.PostMapping;

import org.springframework.web.bind.annotation.PutMapping;

import org.springframework.web.bind.annotation.RequestBody;

import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RequestParam;

import org.springframework.web.bind.annotation.RestController;

import com.company.project.service.schedule.EgovScheduleService;

import com.company.project.service.schedule.dto.ScheduleDto;

import com.company.project.security.service.CustomUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j;

/**

 * ??      ?     ??REST API Controller

 */

@Slf4j

@RestController

@RequestMapping("/api/v1/schedule")

@RequiredArgsConstructor

public class ScheduleController {

    private final EgovScheduleService egovScheduleService;

    @GetMapping

    public ResponseEntity<Map<String, Object>> getScheduleList(

            @RequestParam(defaultValue = "1") int pageIndex,

            @RequestParam(defaultValue = "10") int pageUnit) {

        String userId = getCurrentUserId();

        PageRequest pageable = PageRequest.of(pageIndex - 1, pageUnit);

        Page<ScheduleDto> pageResult = egovScheduleService.getScheduleList(userId, pageable);

        Map<String, Object> response = new HashMap<>();

        response.put("resultList", pageResult.getContent());

        response.put("totalCount", pageResult.getTotalElements());

        response.put("pageIndex", pageIndex);

        response.put("totalPages", pageResult.getTotalPages());

        return ResponseEntity.ok(response);

    }

    @GetMapping("/monthly")

    public ResponseEntity<Map<String, Object>> getMonthlySchedule(

            @RequestParam String yearMonth) {

        String userId = getCurrentUserId();

        List<ScheduleDto> schedules = egovScheduleService.getMonthlySchedule(userId, yearMonth);

        return ResponseEntity.ok(Map.of("schedules", schedules, "yearMonth", yearMonth));

    }

    @GetMapping("/range")

    public ResponseEntity<Map<String, Object>> getScheduleByDateRange(

            @RequestParam String startDate,

            @RequestParam String endDate) {

        String userId = getCurrentUserId();

        List<ScheduleDto> schedules = egovScheduleService.getScheduleListByDateRange(userId, startDate, endDate);

        return ResponseEntity.ok(Map.of("schedules", schedules));

    }

    @GetMapping("/{id}")

    public ResponseEntity<Map<String, Object>> getSchedule(@PathVariable String id) {

        ScheduleDto dto = egovScheduleService.getSchedule(id);

        if (dto == null) {

            return ResponseEntity.notFound().build();

        }

        return ResponseEntity.ok(Map.of("schedule", dto));

    }

    @PostMapping

    public ResponseEntity<Map<String, Object>> createSchedule(@RequestBody ScheduleDto dto) {

        String userId = getCurrentUserId();

        if (userId.equals("anonymous")) {

            return ResponseEntity.status(401).body(Map.of("error", "         ??          ?         ??      ??"));

        }

        try {

            String newId = egovScheduleService.createSchedule(userId, dto);

            return ResponseEntity.ok(Map.of("success", true, "scheduleId", newId, "message", "??      ???         ??   ???     ??"));

        } catch (Exception e) {

            log.error("Failed to create schedule: {}", e.getMessage());

            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));

        }

    }

    @PutMapping("/{id}")

    public ResponseEntity<Map<String, Object>> updateSchedule(@PathVariable String id, @RequestBody ScheduleDto dto) {

        String userId = getCurrentUserId();

        try {

            egovScheduleService.updateSchedule(id, userId, dto);

            return ResponseEntity.ok(Map.of("success", true, "message", "??      ????      ??   ???     ??"));

        } catch (Exception e) {

            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));

        }

    }

    @DeleteMapping("/{id}")

    public ResponseEntity<Map<String, Object>> deleteSchedule(@PathVariable String id) {

        String userId = getCurrentUserId();

        try {

            egovScheduleService.deleteSchedule(id, userId);

            return ResponseEntity.ok(Map.of("success", true, "message", "??      ???????   ???     ??"));

        } catch (Exception e) {

            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));

        }

    }

    private String getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
            return userDetails.getUser().getEsntlId();
        }
        return "anonymous";
    }

}