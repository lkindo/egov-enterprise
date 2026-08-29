package nuri.api.controller.foundation.controller.system;

import nuri.api.controller.foundation.controller.system.dto.HealthStatusResponse;
import nuri.foundation.core.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "System Health", description = "시스템 헬스체크 및 상태 확인 API")
@RestController
@RequestMapping("/api/v1/health")
public class HealthCheckApiController {

    /** 빌드에 고정된 표기 버전. 런타임에서 측정하지 않는다. */
    private static final String DISPLAY_VERSION = "5.0.0";

    @Operation(summary = "Check API Health Status", description = "API 서버의 동작 상태를 확인합니다.")
    @GetMapping
    public ResponseEntity<ApiResponse<HealthStatusResponse>> checkHealth() {
        return ResponseEntity.ok(ApiResponse.success(
                new HealthStatusResponse("UP", System.currentTimeMillis(), DISPLAY_VERSION)));
    }
}
