package nuri.business.service.menu.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

/** 보존 중인 즐겨찾기 중 서버가 숨긴 항목은 개수만 공개한다. */
@Schema(description = "내 즐겨찾기 목록과 사용할 수 없는 항목 수")
public record MenuBookmarkStatusDto(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<MenuBookmarkDto> bookmarks,
        @Schema(description = "메뉴 배정·사용 여부로 서버가 숨긴 항목 수", minimum = "0",
                requiredMode = Schema.RequiredMode.REQUIRED) int unavailableCount) {
}
