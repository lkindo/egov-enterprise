package nuri.api.controller.foundation.controller.system.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 헬스체크 응답.
 *
 * <p>종전 {@code ApiResponse<Map<String, Object>>} 였다 — 생성된 프런트 타입이
 * {@code Record<string, never>}(어떤 값도 담을 수 없는 타입)가 되어 계약 체인이 끊겼다.
 */
public record HealthStatusResponse(
        @Schema(description = "서비스 상태", allowableValues = "UP", requiredMode = Schema.RequiredMode.REQUIRED)
        String status,
        @Schema(description = "응답 생성 시각(epoch milliseconds)", requiredMode = Schema.RequiredMode.REQUIRED)
        long timestamp,
        @Schema(description = "빌드에 고정된 표기 버전. 런타임에서 측정한 값이 아니다.",
                requiredMode = Schema.RequiredMode.REQUIRED, example = "5.0.0")
        String version) {
}
