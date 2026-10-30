package nuri.business.service.menu;

import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import nuri.business.domain.menu.BkmkMenu;
import nuri.business.domain.menu.BkmkMenuRepository;
import nuri.business.domain.menu.Menu;
import nuri.business.domain.menu.MenuRepository;
import nuri.business.domain.user.repository.UserRepository;
import nuri.business.security.authorization.AuthorizationSnapshotService;
import nuri.business.security.util.SecurityUtil;
import nuri.business.service.menu.dto.MenuBookmarkCleanupRequest;
import nuri.business.service.menu.dto.MenuBookmarkCleanupResult;
import nuri.business.service.menu.dto.MenuBookmarkDto;
import nuri.business.service.menu.dto.MenuBookmarkStatusDto;
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
    private final UserRepository userRepository;
    private final AuthorizationSnapshotService authorizationSnapshotService;

    public List<MenuBookmarkDto> getMyBookmarks(String esntlId) {
        SecurityUtil.assertOwnerByEsntlId(esntlId);
        return loadBookmarkStatus(esntlId).bookmarks();
    }

    public MenuBookmarkStatusDto getMyBookmarkStatus(String esntlId) {
        SecurityUtil.assertOwnerByEsntlId(esntlId);
        return loadBookmarkStatus(esntlId);
    }

    private MenuBookmarkStatusDto loadBookmarkStatus(String esntlId) {
        List<BkmkMenu> rows = bkmkMenuRepository.findByIdUserIdOrderByCrtDtAsc(Objects.requireNonNull(esntlId));
        if (rows.isEmpty()) {
            return new MenuBookmarkStatusDto(List.of(), 0);
        }
        Map<Long, Menu> visible = visibleMenus(rows.stream().map(row -> row.getId().getMenuId()).toList());
        List<MenuBookmarkDto> bookmarks = rows.stream()
                .map(row -> visible.get(row.getId().getMenuId()))
                .filter(Objects::nonNull)
                .map(menu -> new MenuBookmarkDto(menu.getMenuSn(), menu.getMenuNm()))
                .toList();
        return new MenuBookmarkStatusDto(bookmarks, rows.size() - bookmarks.size());
    }

    @Transactional
    public void addBookmark(String esntlId, Long menuNo) {
        lockBookmarkOwner(esntlId);
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
                    "즐겨찾기는 " + MAX_BOOKMARKS + "개까지 둘 수 있습니다. 사이드바 즐겨찾기에서 사용할 수 없는 항목을 정리하거나 기존 즐겨찾기를 빼 주세요.");
        }
        bkmkMenuRepository.save(BkmkMenu.create(id, menu.getMenuNm(), null));
    }

    /** 없으면 아무 일도 하지 않는다 — 이미 뺀 즐겨찾기를 다시 빼는 것은 실패가 아니다. */
    @Transactional
    public void removeBookmark(String esntlId, Long menuNo) {
        lockBookmarkOwner(esntlId);
        bkmkMenuRepository.deleteById(new BkmkMenu.BkmkMenuId(Objects.requireNonNull(menuNo), Objects.requireNonNull(esntlId)));
    }

    /** 본인이 확인한 서버 숨김 개수와 화면 후보가 현재 상태와 맞을 때만 한 번에 정리한다. */
    @Transactional
    public MenuBookmarkCleanupResult cleanupUnavailableBookmarks(String esntlId, MenuBookmarkCleanupRequest request) {
        lockBookmarkOwner(esntlId);
        validateCleanupRequest(request);
        // A principal can become stale while waiting for the owner row. Re-read both version and groups after the lock.
        var snapshot = authorizationSnapshotService.load(esntlId);
        if (!snapshot.authorizationVersion().equals(request.expectedAuthorizationVersion())) {
            throw changedBookmarks();
        }
        List<BkmkMenu> rows = bkmkMenuRepository.findByIdUserIdOrderByCrtDtAsc(esntlId);
        Map<Long, Menu> visible = rows.isEmpty() ? Map.of()
                : visibleMenus(rows.stream().map(row -> row.getId().getMenuId()).toList(),
                        menuService.allowedMenuIdsForGroups(snapshot.groups()));
        Set<Long> uiUnavailable = new HashSet<>(request.uiUnavailableMenuNos());
        if (rows.size() - visible.size() != request.expectedServerUnavailableCount()
                || !visible.keySet().containsAll(uiUnavailable)) {
            throw changedBookmarks();
        }
        // Only entities loaded through the owner query are deleted. No caller-supplied ID can widen the owner scope.
        List<BkmkMenu> removed = rows.stream()
                .filter(row -> !visible.containsKey(row.getId().getMenuId()) || uiUnavailable.contains(row.getId().getMenuId()))
                .toList();
        if (!removed.isEmpty()) {
            bkmkMenuRepository.deleteAll(removed);
        }
        return new MenuBookmarkCleanupResult(removed.size());
    }

    private static void validateCleanupRequest(MenuBookmarkCleanupRequest request) {
        if (request == null) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "정리할 즐겨찾기를 다시 확인해 주세요.");
        }
        String expectedVersion = request.expectedAuthorizationVersion();
        if (expectedVersion == null || expectedVersion.isBlank() || expectedVersion.length() > 64
                || request.expectedServerUnavailableCount() == null || request.expectedServerUnavailableCount() < 0
                || request.uiUnavailableMenuNos() == null || request.uiUnavailableMenuNos().size() > MAX_BOOKMARKS
                || request.uiUnavailableMenuNos().stream().anyMatch(menuNo -> menuNo == null || menuNo <= 0)
                || new HashSet<>(request.uiUnavailableMenuNos()).size() != request.uiUnavailableMenuNos().size()) {
            throw new BusinessException(CommonErrorCode.INVALID_INPUT_VALUE, "정리할 즐겨찾기를 다시 확인해 주세요.");
        }
    }

    private static BusinessException changedBookmarks() {
        return new BusinessException(CommonErrorCode.CONCURRENT_MODIFICATION, "즐겨찾기 상태가 변경되었습니다. 다시 확인해 주세요.");
    }

    private void lockBookmarkOwner(String esntlId) {
        SecurityUtil.assertOwnerByEsntlId(esntlId);
        // Existing user row serializes count + insert and removal even when no bookmarks exist yet.
        // All competing writes lock the same parent; a per-bookmark lock cannot protect the quota.
        userRepository.findByEsntlIdForUpdate(Objects.requireNonNull(esntlId))
                .orElseThrow(() -> new BusinessException(CommonErrorCode.RESOURCE_NOT_FOUND));
    }

    private Map<Long, Menu> visibleMenus(Collection<Long> menuNos) {
        return visibleMenus(menuNos, menuService.allowedMenuIdsForCurrentUser());
    }

    private Map<Long, Menu> visibleMenus(Collection<Long> menuNos, Set<Long> allowed) {
        Map<Long, Menu> result = new LinkedHashMap<>();
        menuRepository.findAllById(menuNos).forEach(menu -> {
            if (allowed.contains(menu.getMenuSn()) && "Y".equals(menu.getUseYn())) {
                result.put(menu.getMenuSn(), menu);
            }
        });
        return result;
    }
}
