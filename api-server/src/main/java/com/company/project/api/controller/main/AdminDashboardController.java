package com.company.project.api.controller.main;

import com.company.project.core.response.ApiResponse;
import com.company.project.domain.board.BoardRepository;
import com.company.project.domain.trouble.TroblRepository;
import com.company.project.domain.user.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Tag(name = "Admin Dashboard", description = "관리자 대시보드 API")
@RestController
@RequestMapping("/api/v1/admin/dashboard")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final UserRepository userRepository;
    private final BoardRepository boardRepository;
    private final TroblRepository troblRepository;

    @Operation(summary = "시스템 현황 요약 조회")
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemSummary() {
        Map<String, Object> summary = new HashMap<>();

        // 1. 총 사용자 수
        long totalUsers = userRepository.count();
        summary.put("totalUsers", totalUsers);

        // 2. 오늘의 신규 가입자 (가상 로직: createdDate 기준)
        // 실제로는 LocalDateTime.now()의 시작/끝으로 범위 검색 필요하나, 여기선 전체 카운트로 대체 (데모용)
        summary.put("newUsersToday", 0); 

        // 3. 미처리 장애 접수 (상태: R-접수)
        // searchTroblReqsts 메서드 활용 (이름/종류 null, 상태 "R")
        long pendingTroubles = troblRepository.searchTroblReqsts(null, null, "R", PageRequest.of(0, 1)).getTotalElements();
        summary.put("pendingTroubles", pendingTroubles);

        // 4. 총 게시글 수
        long totalPosts = boardRepository.count();
        summary.put("totalPosts", totalPosts);

        // 5. 시스템 가동 시간 (가상 데이터)
        summary.put("systemUptime", "12일 4시간 30분");

        return ResponseEntity.ok(ApiResponse.success(summary));
    }
}
