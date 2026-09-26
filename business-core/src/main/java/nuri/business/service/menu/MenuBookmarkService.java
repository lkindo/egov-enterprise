package nuri.business.service.menu;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import lombok.RequiredArgsConstructor;
import nuri.business.domain.menu.BkmkMenu;
import nuri.business.domain.menu.BkmkMenuRepository;
import nuri.business.domain.menu.Menu;
import nuri.business.domain.menu.MenuRepository;
import nuri.business.service.menu.dto.MenuBookmarkDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 내 메뉴 즐겨찾기(2026-09-26 DIP B5 F2).
 *
 * <p>대상은 호출한 본인(esntlId)으로 고정된다 — 컨트롤러가 인증 주체의 esntlId 를 넘기며, 다른 사람의 즐겨찾기를
 * 고르는 입력은 없다. 즐겨찾기할 수 있는 메뉴는 지금 내 그룹에 메뉴 배정(NAVIGATION)이 있고 사용 중인 메뉴뿐이며,
 * 배정이 회수된 메뉴는 목록에서 빠진다(행은 남아도 보이지 않는다).
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MenuBookmarkService {

    /** 한 사람이 둘 수 있는 즐겨찾기 수 — 명령 센터·사이드바가 한 번에 읽는 목록이라 상한을 둔다. */
    static final int MAX_BOOKMARKS = 30;

    private final BkmkMenuRepository bkmkMenuRepository;
    private final MenuRepository menuRepository;
    private final MenuService menuService;

    public List<MenuBookmarkDto> getMyBookmarks(String esntlId) {
        List<BkmkMenu> rows = bkmkMenuRepository.findByIdUserIdOrderByCrtDtAsc(Objects.requireNonNull(esntlId));
        if (rows.isEmpty()) {
            return List.of();
        }
        Map<Long, Menu> visible = visibleMenus(rows.stream().map(row -> row.getId().getMenuId()).toList());
        return rows.stream()
                .map(row -> visible.get(row.getId().getMenuId()))
                .filter(Objects::nonNull)
                .map(menu -> new MenuBookmarkDto(menu.getMenuSn(), menu.getMenuNm()))
                .toList();
    }

    @Transactional
    public void addBookmark(String esntlId, Long menuNo) {
        Menu menu = visibleMenus(List.of(Objects.requireNonNull(menuNo))).get(menuNo);
        if (menu == null) {
            throw new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND, "즐겨찾기할 수 있는 메뉴가 아닙니다.");
        }
        BkmkMenu.BkmkMenuId id = new BkmkMenu.BkmkMenuId(menuNo, Objects.requireNonNull(esntlId));
        if (bkmkMenuRepository.existsById(id)) {
            return;
        }
        if (bkmkMenuRepository.countByIdUserId(esntlId) >= MAX_BOOKMARKS) {
            throw new BusinessException(CommonErrorCode.RESOURCE_IN_USE,
                    "즐겨찾기는 " + MAX_BOOKMARKS + "개까지 둘 수 있습니다. 쓰지 않는 즐겨찾기를 빼 주세요.");
        }
        bkmkMenuRepository.save(BkmkMenu.create(id, menu.getMenuNm(), null));
    }

    /** 없으면 아무 일도 하지 않는다 — 이미 뺀 즐겨찾기를 다시 빼는 것은 실패가 아니다. */
    @Transactional
    public void removeBookmark(String esntlId, Long menuNo) {
        bkmkMenuRepository.deleteById(new BkmkMenu.BkmkMenuId(Objects.requireNonNull(menuNo), Objects.requireNonNull(esntlId)));
    }

    private Map<Long, Menu> visibleMenus(Collection<Long> menuNos) {
        java.util.Set<Long> allowed = menuService.allowedMenuIdsForCurrentUser();
        Map<Long, Menu> result = new LinkedHashMap<>();
        menuRepository.findAllById(menuNos).forEach(menu -> {
            if (allowed.contains(menu.getMenuSn()) && "Y".equals(menu.getUseYn())) {
                result.put(menu.getMenuSn(), menu);
            }
        });
        return result;
    }
}
