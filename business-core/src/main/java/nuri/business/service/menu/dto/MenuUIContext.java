package nuri.business.service.menu.dto;

import lombok.Builder;
import lombok.Getter;
import java.util.List;

/**
 * Legacy UI 구성을 위한 메뉴 컨텍스트 DTO
 */
@Getter
@Builder
public class MenuUIContext {
    private final List<MenuDto> rootMenus;
    private final List<MenuDto> flatMenus;
    private final Long activeRootMenuId;
    private final List<MenuDto> subMenus;
}
