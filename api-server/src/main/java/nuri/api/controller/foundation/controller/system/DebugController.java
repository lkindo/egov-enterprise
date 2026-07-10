package nuri.api.controller.foundation.controller.system;

import nuri.foundation.core.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Debug", description = "시스템 디버깅용 API")
@RestController("systemDebugController")
@RequestMapping("/api/v1/public/debug")
// [보안] 공개(permitAll) 강제-500 디버그 엔드포인트가 운영에 상시 노출되지 않도록 prod 프로파일에서 빈 미등록.
@org.springframework.context.annotation.Profile("!prod")
public class DebugController {

    @Operation(summary = "강제 500 에러 발생", description = "GlobalExceptionHandler 작동 여부를 테스트하기 위해 500 에러를 강제로 발생시킵니다.")
    @GetMapping("/error")
    public ResponseEntity<ApiResponse<Void>> triggerError() {
        throw new RuntimeException("Debug: This is a forced 500 error for verification.");
    }
}
