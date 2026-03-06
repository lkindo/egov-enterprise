package com.company.project.api.controller.main;

import com.company.project.core.response.ApiResponse;

import com.company.project.domain.board.BoardRepository;

import com.company.project.domain.trouble.TroblRepository;

import com.company.project.domain.user.repository.UserRepository;

import io.swagger.v3.oas.annotations.Operation;

import io.swagger.v3.oas.annotations.tags.Tag;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.PageRequest;

import org.springframework.http.ResponseEntity;

import org.springframework.web.bind.annotation.GetMapping;

import org.springframework.web.bind.annotation.RequestMapping;

import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;

import java.util.Map;

@Tag(name = "Admin Dashboard", description = "?     ?          ????      ??API")

@RestController

@RequestMapping("/api/v1/admin/dashboard")

@RequiredArgsConstructor

public class AdminDashboardController {

    private final UserRepository userRepository;

    private final BoardRepository boardRepository;

    private final TroblRepository troblRepository;

@Operation(summary = "??      ???          ?                   ??")

    @GetMapping("/summary")

    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemSummary() {

        Map<String, Object> summary = new HashMap<>();

        // 1. ?????????

        long totalUsers = userRepository.count();

        summary.put("totalUsers", totalUsers);

        // 2. ??      ???                  ??       (        ??            ? createdDate          ?)

        // ??               ??LocalDateTime.now()????      /??         ?         ??        ???         ??      , ??   ???                   ??          ??   ?(?         ??

        summary.put("newUsersToday", 0);

        // 3.                   ??      ??          (?         : R-?         )

        // searchTroblReqsts             ????       (??     ??         ?null, ?          "R")

        long pendingTroubles = troblRepository

                .searchTroblReqsts(null, null, java.util.Collections.singletonList("R"), PageRequest.of(0, 1))

                .getTotalElements();

        summary.put("pendingTroubles", pendingTroubles);

        // 4. ??         ?      ? ??

        long totalPosts = boardRepository.count();

        summary.put("totalPosts", totalPosts);

        // 5. ??      ??        ????       (        ???         ??

        summary.put("systemUptime", "12??4??       30??");

        return ResponseEntity.ok(ApiResponse.success(summary));

    }

}
