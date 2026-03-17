package com.company.project.api.controller.main;

import com.company.project.core.response.ApiResponse;
import com.company.project.core.exception.ErrorCode;
import com.company.project.service.board.EgovBoardService;
import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.informalsanction.InformalSanctionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Tag(name = "Dashboard", description = "메인 대시보드 데이터 제공 API")
@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardApiController {

    private final EgovBoardService boardService;
    private final InformalSanctionService approvalService;

    @Operation(summary = "메인 대시보드 요약 데이터 조회", description = "공지사항, 할 일, 결재 대기 건수 등을 통합 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardData(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error(ErrorCode.UNAUTHORIZED, "User not authenticated"));
        }

        String userId = userDetails.getUsername();
        log.info(">>> [Dashboard] Fetching data for user: {}", userId);
        Map<String, Object> result = new HashMap<>();

        // 1. 할 일 목록 (공통 게시판)
        try {
            Page<BoardDto> taskList = boardService.getBoardPosts("BBSMSTR_CCCCCCCCCCCC", PageRequest.of(0, 5));
            result.put("taskList", taskList.getContent());
        } catch (Exception e) {
            log.error("Failed to fetch task list", e);
            result.put("taskList", List.of());
        }

        // 2. 공지사항 목록
        try {
            Page<BoardDto> notiList = boardService.getBoardPosts("BBSMSTR_AAAAAAAAAAAA", PageRequest.of(0, 5));
            result.put("notiList", notiList.getContent());
        } catch (Exception e) {
            log.error("Failed to fetch notice list", e);
            result.put("notiList", List.of());
        }

        // 3. 결재 대기 건수 (전자결재)
        try {
            long pendingApprovalCount = approvalService.getReceivedInformalSanctionList(userId, Pageable.unpaged()).getTotalElements();
            result.put("pendingApprovalCount", pendingApprovalCount);
        } catch (Exception e) {
            log.error("Failed to fetch pending approval count", e);
            result.put("pendingApprovalCount", 0);
        }

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
