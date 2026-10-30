package nuri.business.service.menu;

import nuri.business.domain.menu.BkmkMenu;
import nuri.business.domain.menu.BkmkMenuRepository;
import nuri.business.domain.menu.Menu;
import nuri.business.domain.menu.MenuRepository;
import nuri.business.security.authorization.AuthorizationSnapshotService;
import nuri.business.service.menu.dto.MenuBookmarkCleanupRequest;
import nuri.business.service.menu.dto.MenuBookmarkDto;
import nuri.business.service.menu.dto.MenuBookmarkStatusDto;
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
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
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
    @Mock
    private nuri.business.domain.user.repository.UserRepository userRepository;
    @Mock
    private AuthorizationSnapshotService authorizationSnapshotService;

    @InjectMocks
    private MenuBookmarkService service;

    @org.junit.jupiter.api.BeforeEach
    void authenticateOwner() {
        var principal = nuri.foundation.security.service.CustomUserDetails.builder()
                .userId("bookmark-owner").esntlId(ME).enabled(true).lockAt("N").build();
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, List.of()));
        org.mockito.Mockito.lenient().when(userRepository.findByEsntlIdForUpdate(ME))
                .thenReturn(java.util.Optional.of(org.mockito.Mockito.mock(nuri.business.domain.user.entity.User.class)));
    }

    @org.junit.jupiter.api.AfterEach
    void clearPrincipal() {
        org.springframework.security.core.context.SecurityContextHolder.clearContext();
    }

    @Test
    void anotherUserCannotBeSelectedThroughServiceArguments() {
        assertThatThrownBy(() -> service.getMyBookmarks("OTHER")).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThatThrownBy(() -> service.addBookmark("OTHER", 10L)).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThatThrownBy(() -> service.removeBookmark("OTHER", 10L)).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThatThrownBy(() -> service.getMyBookmarkStatus("OTHER")).isInstanceOf(BusinessException.class)
                .extracting("errorCode").isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThatThrownBy(() -> service.cleanupUnavailableBookmarks("OTHER", cleanup(0, List.of())))
                .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(CommonErrorCode.ACCESS_DENIED);
        verifyNoInteractions(bkmkMenuRepository, menuRepository, userRepository, authorizationSnapshotService);
    }

    @Test
    void administrativeMembershipDoesNotPermitCleaningAnotherOwnersBookmarks() {
        var principal = nuri.foundation.security.service.CustomUserDetails.builder()
                .userId("bookmark-admin").esntlId(ME).enabled(true).lockAt("N")
                .groups(List.of("ROLE_ADMIN")).permissions(List.of("AUTHRT_GRANT")).build();
        org.springframework.security.core.context.SecurityContextHolder.getContext().setAuthentication(
                new org.springframework.security.authentication.UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities()));

        assertThatThrownBy(() -> service.cleanupUnavailableBookmarks("OTHER", cleanup(0, List.of())))
                .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(CommonErrorCode.ACCESS_DENIED);
        assertThatThrownBy(() -> service.getMyBookmarkStatus("OTHER"))
                .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(CommonErrorCode.ACCESS_DENIED);
        verifyNoInteractions(bkmkMenuRepository, menuRepository, userRepository, authorizationSnapshotService);
    }

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

    @Test
    void statusCountsHiddenRowsWithoutDeletingOrDisclosingThem() {
        when(bkmkMenuRepository.findByIdUserIdOrderByCrtDtAsc(ME))
                .thenReturn(List.of(row(30), row(10), row(20), row(40), row(50)));
        when(menuService.allowedMenuIdsForCurrentUser()).thenReturn(Set.of(10L, 30L, 40L, 50L));
        when(menuRepository.findAllById(any())).thenReturn(List.of(
                menu(10, "공지", "Y"), menu(20, "회수된 메뉴", "Y"),
                menu(30, "결재함", "Y"), menu(40, "꺼진 메뉴", "N")));

        assertThat(service.getMyBookmarkStatus(ME)).isEqualTo(new MenuBookmarkStatusDto(
                List.of(new MenuBookmarkDto(30L, "결재함"), new MenuBookmarkDto(10L, "공지")), 3));
        verify(bkmkMenuRepository, never()).deleteAll(any());
        verify(bkmkMenuRepository, never()).deleteById(any());
        verify(bkmkMenuRepository, never()).save(any());
    }

    @Test
    void emptyStatusIsZeroWithoutLookingUpMenus() {
        when(bkmkMenuRepository.findByIdUserIdOrderByCrtDtAsc(ME)).thenReturn(List.of());

        assertThat(service.getMyBookmarkStatus(ME)).isEqualTo(new MenuBookmarkStatusDto(List.of(), 0));
        assertThat(service.getMyBookmarks(ME)).isEmpty();
        verifyNoInteractions(menuRepository, menuService);
    }

    @Test
    void statusReadFailureIsNotAnEmptySuccess() {
        when(bkmkMenuRepository.findByIdUserIdOrderByCrtDtAsc(ME))
                .thenThrow(new IllegalStateException("fixture database unavailable"));

        assertThatThrownBy(() -> service.getMyBookmarkStatus(ME))
                .isInstanceOf(IllegalStateException.class).hasMessage("fixture database unavailable");
        verifyNoInteractions(menuRepository, menuService);
    }

    @Test
    void cleanupReloadsAuthorizationAfterOwnerLockAndUsesFreshGroups() {
        var hidden = row(30);
        var uiUnavailable = row(20);
        var retained = row(10);
        when(authorizationSnapshotService.load(ME)).thenReturn(snapshot());
        when(bkmkMenuRepository.findByIdUserIdOrderByCrtDtAsc(ME))
                .thenReturn(List.of(hidden, uiUnavailable, retained));
        when(menuService.allowedMenuIdsForGroups(List.of("CURRENT_GROUP"))).thenReturn(Set.of(10L, 20L));
        when(menuRepository.findAllById(any())).thenReturn(List.of(
                menu(30, "서버 숨김", "Y"), menu(20, "화면 숨김", "Y"), menu(10, "유지", "Y")));

        assertThat(service.cleanupUnavailableBookmarks(ME, cleanup(1, List.of(20L))).removedCount()).isEqualTo(2);

        var order = inOrder(userRepository, authorizationSnapshotService, bkmkMenuRepository, menuService);
        order.verify(userRepository).findByEsntlIdForUpdate(ME);
        order.verify(authorizationSnapshotService).load(ME);
        order.verify(bkmkMenuRepository).findByIdUserIdOrderByCrtDtAsc(ME);
        order.verify(menuService).allowedMenuIdsForGroups(List.of("CURRENT_GROUP"));
        order.verify(bkmkMenuRepository).deleteAll(List.of(hidden, uiUnavailable));
        verify(menuService, never()).allowedMenuIdsForCurrentUser();
        verify(bkmkMenuRepository, never()).deleteById(any());
    }

    @Test
    void staleAuthorizationRejectsBeforeReadingOrDeletingBookmarks() {
        when(authorizationSnapshotService.load(ME)).thenReturn(snapshot());

        assertConflict(new MenuBookmarkCleanupRequest("old-version", 0, List.of()));

        verifyNoInteractions(bkmkMenuRepository, menuRepository, menuService);
    }

    @Test
    void restoredServerAvailabilityChangesCountAndPreservesAllRows() {
        when(authorizationSnapshotService.load(ME)).thenReturn(snapshot());
        when(bkmkMenuRepository.findByIdUserIdOrderByCrtDtAsc(ME)).thenReturn(List.of(row(10)));
        when(menuService.allowedMenuIdsForGroups(List.of("CURRENT_GROUP"))).thenReturn(Set.of(10L));
        when(menuRepository.findAllById(any())).thenReturn(List.of(menu(10, "복구됨", "Y")));

        assertConflict(cleanup(1, List.of()));
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(longs = {20L, 99L})
    void uiCandidatesMustStillBeOwnedAndServerVisible(long candidate) {
        when(authorizationSnapshotService.load(ME)).thenReturn(snapshot());
        when(bkmkMenuRepository.findByIdUserIdOrderByCrtDtAsc(ME)).thenReturn(List.of(row(10), row(20)));
        when(menuService.allowedMenuIdsForGroups(List.of("CURRENT_GROUP"))).thenReturn(Set.of(10L));
        when(menuRepository.findAllById(any())).thenReturn(List.of(menu(10, "유지", "Y"), menu(20, "서버 숨김", "Y")));

        assertConflict(cleanup(1, List.of(candidate)));
    }

    @Test
    void currentZeroCleanupDoesNotDeleteAnything() {
        when(authorizationSnapshotService.load(ME)).thenReturn(snapshot());
        when(bkmkMenuRepository.findByIdUserIdOrderByCrtDtAsc(ME)).thenReturn(List.of());

        assertThat(service.cleanupUnavailableBookmarks(ME, cleanup(0, List.of())).removedCount()).isZero();

        verifyNoInteractions(menuRepository, menuService);
        verify(bkmkMenuRepository, never()).deleteAll(any());
    }

    @Test
    void visibleBookmarksRemainWhenThereAreNoConfirmedCandidates() {
        when(authorizationSnapshotService.load(ME)).thenReturn(snapshot());
        when(bkmkMenuRepository.findByIdUserIdOrderByCrtDtAsc(ME)).thenReturn(List.of(row(10)));
        when(menuService.allowedMenuIdsForGroups(List.of("CURRENT_GROUP"))).thenReturn(Set.of(10L));
        when(menuRepository.findAllById(any())).thenReturn(List.of(menu(10, "유지", "Y")));

        assertThat(service.cleanupUnavailableBookmarks(ME, cleanup(0, List.of())).removedCount()).isZero();

        verify(bkmkMenuRepository, never()).deleteAll(any());
        verify(bkmkMenuRepository, never()).deleteById(any());
    }

    @Test
    void missingOwnerStopsCleanupBeforeAuthorizationRead() {
        when(userRepository.findByEsntlIdForUpdate(ME)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> service.cleanupUnavailableBookmarks(ME, cleanup(0, List.of())))
                .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(CommonErrorCode.RESOURCE_NOT_FOUND);
        verifyNoInteractions(authorizationSnapshotService, bkmkMenuRepository, menuRepository, menuService);
    }

    @Test
    void deletionFailureDoesNotReturnASuccessfulCount() {
        var hidden = row(20);
        when(authorizationSnapshotService.load(ME)).thenReturn(snapshot());
        when(bkmkMenuRepository.findByIdUserIdOrderByCrtDtAsc(ME)).thenReturn(List.of(hidden));
        when(menuService.allowedMenuIdsForGroups(List.of("CURRENT_GROUP"))).thenReturn(Set.of());
        when(menuRepository.findAllById(any())).thenReturn(List.of(menu(20, "서버 숨김", "Y")));
        doThrow(new IllegalStateException("fixture delete failed")).when(bkmkMenuRepository).deleteAll(List.of(hidden));

        assertThatThrownBy(() -> service.cleanupUnavailableBookmarks(ME, cleanup(1, List.of())))
                .isInstanceOf(IllegalStateException.class).hasMessage("fixture delete failed");
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.MethodSource("invalidCleanupRequests")
    void directServiceRejectsInvalidConfirmation(MenuBookmarkCleanupRequest request) {
        assertThatThrownBy(() -> service.cleanupUnavailableBookmarks(ME, request))
                .isInstanceOf(BusinessException.class).extracting("errorCode").isEqualTo(CommonErrorCode.INVALID_INPUT_VALUE);
        verifyNoInteractions(authorizationSnapshotService, bkmkMenuRepository, menuRepository, menuService);
    }

    private static java.util.stream.Stream<MenuBookmarkCleanupRequest> invalidCleanupRequests() {
        return java.util.stream.Stream.of(
                null,
                new MenuBookmarkCleanupRequest(null, 0, List.of()),
                new MenuBookmarkCleanupRequest("  ", 0, List.of()),
                new MenuBookmarkCleanupRequest("a".repeat(65), 0, List.of()),
                new MenuBookmarkCleanupRequest("current-version", null, List.of()),
                cleanup(-1, List.of()),
                cleanup(0, null),
                cleanup(0, java.util.stream.LongStream.rangeClosed(1, 31).boxed().toList()),
                cleanup(0, java.util.Arrays.asList((Long) null)),
                cleanup(0, List.of(0L)),
                cleanup(0, List.of(-1L)),
                cleanup(0, List.of(10L, 10L)));
    }

    private static AuthorizationSnapshotService.Snapshot snapshot() {
        return new AuthorizationSnapshotService.Snapshot(List.of("CURRENT_GROUP"), List.of(), "current-version");
    }

    private static MenuBookmarkCleanupRequest cleanup(int unavailableCount, List<Long> uiUnavailable) {
        return new MenuBookmarkCleanupRequest("current-version", unavailableCount, uiUnavailable);
    }

    private void assertConflict(MenuBookmarkCleanupRequest request) {
        assertThatThrownBy(() -> service.cleanupUnavailableBookmarks(ME, request))
                .isInstanceOf(BusinessException.class).hasMessage("즐겨찾기 상태가 변경되었습니다. 다시 확인해 주세요.")
                .extracting("errorCode").isEqualTo(CommonErrorCode.CONCURRENT_MODIFICATION);
        verify(bkmkMenuRepository, never()).deleteAll(any());
        verify(bkmkMenuRepository, never()).deleteById(any());
    }
}
