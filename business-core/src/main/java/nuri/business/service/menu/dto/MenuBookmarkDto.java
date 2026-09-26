package nuri.business.service.menu.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * 내 메뉴 즐겨찾기 한 건(2026-09-26 DIP B5 F2). 이름은 저장 시점이 아니라 지금 메뉴 이름이다.
 * 화면은 메뉴 번호로 이미 받은 메뉴 트리에서 경로를 찾는다 — 경로를 따로 싣지 않는다.
 */
@Schema(description = "메뉴 즐겨찾기")
public record MenuBookmarkDto(
        @Schema(description = "메뉴 번호", requiredMode = Schema.RequiredMode.REQUIRED) Long menuNo,
        @Schema(description = "메뉴 이름", requiredMode = Schema.RequiredMode.REQUIRED) String menuNm) {
}
