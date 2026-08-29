package nuri.api.controller.foundation.controller.menu.dto;

import java.util.List;

import io.swagger.v3.oas.annotations.media.Schema;
import nuri.business.service.menu.dto.MenuDto;

/**
 * 메뉴 목록 응답.
 *
 * <p>{@code list} 키를 유지한다 — 소비자({@code MenuService.getHeadMenus/getLeftMenus})가
 * {@code res?.list} 로 언랩하므로, 배열을 최상위로 올리면 모든 메뉴 화면이 조용히 빈 목록이 된다.
 * 이 이행의 목적은 표현 변경이 아니라 {@code Map<String, Object>} 로 끊긴 타입 계약의 복구다.
 */
public record MenuListResponse(
        @Schema(description = "메뉴 목록", requiredMode = Schema.RequiredMode.REQUIRED)
        List<MenuDto> list) {

    public static MenuListResponse of(List<MenuDto> list) {
        return new MenuListResponse(list);
    }
}
