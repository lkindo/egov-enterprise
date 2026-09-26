package nuri.business.service.menu;

import nuri.business.domain.menu.BkmkMenu;
import nuri.business.domain.menu.BkmkMenuRepository;
import nuri.business.domain.menu.Menu;
import nuri.business.domain.menu.MenuRepository;
import nuri.business.service.menu.dto.MenuBookmarkDto;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * [2026-09-26 DIP B5 F2] 메뉴 즐겨찾기는 본인 것만, 지금 볼 수 있는 메뉴만 다룬다.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("MenuBookmarkService — 내 메뉴 즐겨찾기")
class MenuBookmarkServiceTest {

    private static final String ME = "USR_ME_0001";

    @Mock
    private BkmkMenuRepository bkmkMenuRepository;
    @Mock
    private MenuRepository menuRepository;
    /** 메뉴 배정 판정은 사이드바와 같은 MenuService 판정을 쓴다. */
    @Mock
    private MenuService menuService;

    @InjectMocks
    private MenuBookmarkService service;

    private static Menu menu(long sn, String name, String useYn) {
        return Menu.builder().menuSn(sn).menuNm(name).useYn(useYn).build();
    }

    private static BkmkMenu row(long menuSn) {
        return BkmkMenu.create(new BkmkMenu.BkmkMenuId(menuSn, ME), "저장 당시 이름", null);
    }

    @Test
    @DisplayName("목록은 즐겨찾기한 순서를 지키고, 배정이 회수됐거나 사용하지 않는 메뉴는 뺀다")
    void listKeepsOrderAndDropsInvisibleMenus() {
        when(bkmkMenuRepository.findByIdUserIdOrderByCrtDtAsc(ME)).thenReturn(List.of(row(30), row(10), row(20), row(40)));
        when(menuService.allowedMenuIdsForCurrentUser()).thenReturn(Set.of(10L, 30L, 40L));
        when(menuRepository.findAllById(any())).thenReturn(List.of(
                menu(10, "공지", "Y"), menu(20, "회수된 메뉴", "Y"), menu(30, "결재함", "Y"), menu(40, "꺼진 메뉴", "N")));

        List<MenuBookmarkDto> result = service.getMyBookmarks(ME);

        // 이름은 저장 당시 이름이 아니라 지금의 메뉴 이름이다
        assertThat(result).containsExactly(new MenuBookmarkDto(30L, "결재함"), new MenuBookmarkDto(10L, "공지"));
    }

    @Test
    @DisplayName("볼 수 없는 메뉴는 즐겨찾기할 수 없다(404) — 메뉴 번호로 숨은 메뉴의 존재를 알리지 않는다")
    void cannotBookmarkInvisibleMenu() {
        when(menuService.allowedMenuIdsForCurrentUser()).thenReturn(Set.of(10L));
        when(menuRepository.findAllById(any())).thenReturn(List.of(menu(99, "관리자 전용", "Y")));

        assertThatThrownBy(() -> service.addBookmark(ME, 99L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
        verify(bkmkMenuRepository, never()).save(any());
    }

    @Test
    @DisplayName("본인 식별자로 저장하고, 이미 있으면 다시 저장하지 않는다")
    void addsForSelfAndIsIdempotent() {
        when(menuService.allowedMenuIdsForCurrentUser()).thenReturn(Set.of(10L));
        when(menuRepository.findAllById(any())).thenReturn(List.of(menu(10, "공지", "Y")));
        when(bkmkMenuRepository.existsById(new BkmkMenu.BkmkMenuId(10L, ME))).thenReturn(false);
        when(bkmkMenuRepository.countByIdUserId(ME)).thenReturn(0L);

        service.addBookmark(ME, 10L);

        ArgumentCaptor<BkmkMenu> saved = ArgumentCaptor.forClass(BkmkMenu.class);
        verify(bkmkMenuRepository).save(saved.capture());
        assertThat(saved.getValue().getId()).isEqualTo(new BkmkMenu.BkmkMenuId(10L, ME));
        assertThat(saved.getValue().getMenuNm()).isEqualTo("공지");

        when(bkmkMenuRepository.existsById(new BkmkMenu.BkmkMenuId(10L, ME))).thenReturn(true);
        service.addBookmark(ME, 10L);
        verify(bkmkMenuRepository).save(any());
    }

    @Test
    @DisplayName("상한(30개)을 넘기면 409 로 거부한다")
    void rejectsBeyondLimit() {
        when(menuService.allowedMenuIdsForCurrentUser()).thenReturn(Set.of(10L));
        when(menuRepository.findAllById(any())).thenReturn(List.of(menu(10, "공지", "Y")));
        when(bkmkMenuRepository.existsById(new BkmkMenu.BkmkMenuId(10L, ME))).thenReturn(false);
        when(bkmkMenuRepository.countByIdUserId(ME)).thenReturn((long) MenuBookmarkService.MAX_BOOKMARKS);

        assertThatThrownBy(() -> service.addBookmark(ME, 10L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.RESOURCE_IN_USE);
        verify(bkmkMenuRepository, never()).save(any());
    }

    @Test
    @DisplayName("빼기는 본인 행만 지운다")
    void removesOwnRowOnly() {
        service.removeBookmark(ME, 10L);

        verify(bkmkMenuRepository).deleteById(new BkmkMenu.BkmkMenuId(10L, ME));
    }
}
