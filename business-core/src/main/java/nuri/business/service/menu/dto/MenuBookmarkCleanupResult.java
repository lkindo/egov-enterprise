package nuri.business.service.menu.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "본인 즐겨찾기 정리 결과")
public record MenuBookmarkCleanupResult(
        @Schema(description = "삭제한 즐겨찾기 수", minimum = "0", requiredMode = Schema.RequiredMode.REQUIRED)
        int removedCount) {
}
