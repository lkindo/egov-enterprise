package nuri.api.controller.business.main;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.business.service.board.EgovBoardService;
import nuri.business.service.board.dto.BoardDto;
import nuri.foundation.core.dashboard.DashboardItemProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
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
    private final List<DashboardItemProvider> dashboardItemProviders;

    @Operation(summary = "메인 대시보드 요약 데이터 조회", description = "공지사항, 할 일, 결재 대기 건수 등을 통합 조회합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardData(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(401).body(ApiResponse.error(CommonErrorCode.UNAUTHORIZED, "User not authenticated"));
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

        // 3. 결재 대기 건수 및 동적 추가 위젯 데이터 수집
        for (DashboardItemProvider provider : dashboardItemProviders) {
            try {
                provider.provideDashboardData(userId, result);
            } catch (Exception e) {
                log.error("Failed to fetch dashboard data from provider: {}", provider.getClass().getSimpleName(), e);
            }
        }

        return ResponseEntity.ok(ApiResponse.success(result));
    }
}
