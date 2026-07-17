package nuri.api.controller.business.main;

import nuri.foundation.core.response.ApiResponse;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.core.dashboard.DashboardItemProvider;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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

    // 모든 대시보드 위젯(할 일·공지=BoardDashboardProvider, 결재대기=InformalSanctionDashboardProvider 등)은
    // DashboardItemProvider 포트로만 주입된다 — 특정 샘플 서비스(BoardService 등) 직접 결합 없음(§2.B 재사용성).
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

        // 등록된 모든 위젯 프로바이더가 자기 데이터를 result 에 채운다(할 일/공지/결재대기 등 동적 확장).
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
