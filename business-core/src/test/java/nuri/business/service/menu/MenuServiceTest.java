package nuri.business.service.menu;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.menu.NavigationGrantRepository;
import nuri.business.service.auth.AuthorizationAdministrationService;
import nuri.business.security.audit.LoginUserAuditorAware;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.business.domain.menu.Menu;
import nuri.business.domain.menu.MenuRepository;
import nuri.business.domain.program.Program;
import nuri.business.domain.program.ProgramRepository;
import nuri.business.service.menu.dto.MenuDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;

@ExtendWith(MockitoExtension.class)
@DisplayName("MenuService 단위 테스트")
class MenuServiceTest {

    @Mock
    private MenuRepository menuRepository;

    @Mock
    private ProgramRepository programRepository;

    @Mock
    private NavigationGrantRepository navigationGrantRepository;

    @Mock
    private AuthorizationAdministrationService authorizationAdministrationService;

    @Spy
    private LoginUserAuditorAware loginUserAuditorAware = new LoginUserAuditorAware();

    @Mock
    private nuri.business.service.program.dto.ProgramMapper programMapper;

    /** 기본은 빈 공급자(getIfAvailable = null) — 저장소를 직접 읽는 경로다. */
    @Mock
    private org.springframework.beans.factory.ObjectProvider<MenuService> selfProvider;

    @InjectMocks
    private MenuService menuService;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setContext(securityContext);
        lenient().when(securityContext.getAuthentication()).thenReturn(authentication);
        useGroup("ROLE_ADMIN");
    }

    private void useGroup(String group) {
        useGroups(group);
    }

    private void useGroups(String... groups) {
        CustomUserDetails principal = CustomUserDetails.builder().userId("tester").esntlId("TESTER_001")
                .groups(List.of(groups)).permissions(List.of("MENU_CREATE", "MENU_UPDATE", "MENU_DELETE", "AUTHRT_GRANT"))
                .enabled(true).build();
        usePrincipal(principal);
    }

    private void usePrincipal(CustomUserDetails principal) {
        lenient().when(authentication.isAuthenticated()).thenReturn(true);
        lenient().when(authentication.getPrincipal()).thenReturn(principal);
        lenient().doReturn(principal.getAuthorities()).when(authentication).getAuthorities();
    }

    private record MenuGrantFixture(Menu menu, String group) {}

    private void stubNavigation(List<MenuGrantFixture> fixtures) {
        when(menuRepository.findAllByOrderByUpMenuSnAscMenuOrdrAsc()).thenReturn(
                fixtures.stream().map(MenuGrantFixture::menu).distinct().toList());
        when(navigationGrantRepository.findAllowedMenuIds(anyList())).thenAnswer(invocation -> {
            List<String> groups = invocation.getArgument(0);
            return fixtures.stream().filter(row -> row.group() != null && groups.contains(row.group()))
                    .map(row -> row.menu().getMenuSn()).collect(java.util.stream.Collectors.toSet());
        });
    }

    private void stubGeneratedMenuId(Long generatedId) {
        when(menuRepository.save(any(Menu.class))).thenAnswer(invocation -> {
            Menu row = invocation.getArgument(0);
            assertThat(row.getMenuSn()).as("create payload ID must not reach the repository").isNull();
            org.springframework.test.util.ReflectionTestUtils.setField(row, "menuSn", generatedId);
            return row;
        });
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("시작 라우트 보강 - null URL 프로그램이 정상 추론을 막지 않고 연결 없는 메뉴는 유지한다")
    void startupRouteMigrationAllowsNullProgramUrlWithoutBlockingOtherMenus() {
        Menu legacy = Menu.builder().menuSn(1L).prgrmFileNm("LegacyQuestion").build();
        Menu byName = Menu.builder().menuSn(2L).prgrmFileNm("BoardManage").build();
        Menu unknown = Menu.builder().menuSn(3L).prgrmFileNm("UnknownRoute").build();
        Menu folder = Menu.builder().menuSn(4L).build();
        when(menuRepository.findAllWithoutModernRoute()).thenReturn(List.of(legacy, byName, unknown, folder));
        when(programRepository.findAll()).thenReturn(List.of(
                Program.builder().prgrmFileNm("LegacyQuestion").url("/uss/olh/faq/EgovFaqListInqire.do").build(),
                Program.builder().prgrmFileNm("BoardManage").url(null).build(),
                Program.builder().prgrmFileNm("UnknownRoute").url(null).build()));

        assertThatCode(menuService::migrateModernRoutes).doesNotThrowAnyException();

        verify(menuRepository).fillModernRouteIfUnchanged(eq(1L), eq("LegacyQuestion"), eq("/admin/help/faq"),
                any(java.time.LocalDateTime.class), eq("tester"));
        verify(menuRepository).fillModernRouteIfUnchanged(eq(2L), eq("BoardManage"), eq("/admin/community/boards"),
                any(java.time.LocalDateTime.class), eq("tester"));
        assertThat(legacy.getModernRoute()).as("조회 스냅샷은 직접 변경하지 않는다").isNull();
        assertThat(byName.getModernRoute()).isNull();
        assertThat(unknown.getModernRoute()).isNull();
        assertThat(folder.getModernRoute()).isNull();
        verify(menuRepository, never()).save(any(Menu.class));
        verify(menuRepository, never()).fillModernRouteIfUnchanged(eq(3L), any(), any(), any(), any());
        verify(menuRepository, never()).fillModernRouteIfUnchanged(eq(4L), any(), any(), any(), any());
    }

    @Test
    @DisplayName("getMenuHierarchy - ADMIN도 명시적으로 부여된 NAVIGATION만 조회")
    void getMenuHierarchy_Admin() {
        // given
        useGroup("ROLE_ADMIN");

        Menu menu1 = Menu.builder().menuSn(1L).menuNm("Menu 1").menuOrdr(1).build();
        Menu menu2 = Menu.builder().menuSn(2L).menuNm("Menu 2").menuOrdr(2).upMenuSn(1L).build();
        
        List<MenuGrantFixture> results = new ArrayList<>();
        results.add(new MenuGrantFixture(menu1, "ROLE_ADMIN"));
        results.add(new MenuGrantFixture(menu2, "ROLE_ADMIN"));
        
        stubNavigation(results);
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        // when
        List<MenuDto> hierarchy = menuService.getMenuHierarchy();

        // then
        assertThat(hierarchy).hasSize(1);
        assertThat(hierarchy.get(0).getMenuNm()).isEqualTo("Menu 1");
        assertThat(hierarchy.get(0).getChildren()).hasSize(1);
    }

    @Test
    @DisplayName("[DIP B5 F10] 사이드바 트리는 프록시를 거쳐 메뉴 캐시를 읽고 저장소를 직접 읽지 않는다 — 권한 필터는 매번 새로 본다")
    void menuTreeReadsCachedMenusThroughProxy() {
        MenuService proxy = org.mockito.Mockito.mock(MenuService.class);
        when(selfProvider.getIfAvailable()).thenReturn(proxy);
        Menu menu = Menu.builder().menuSn(1L).menuNm("Menu").useYn("Y").build();
        when(proxy.getAllMenusCached()).thenReturn(List.of(menu));
        when(navigationGrantRepository.findAllowedMenuIds(List.of("ROLE_ADMIN")))
                .thenReturn(java.util.Set.of(1L)).thenReturn(java.util.Set.of());
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        assertThat(menuService.getMenuHierarchy()).hasSize(1);
        assertThat(menuService.getMenuHierarchy()).isEmpty();
        verify(menuRepository, never()).findAllByOrderByUpMenuSnAscMenuOrdrAsc();
    }

    @Test
    void adminHasNoImplicitNavigationAndRevocationIsReadImmediately() {
        Menu menu = Menu.builder().menuSn(1L).menuNm("Menu").build();
        when(menuRepository.findAllByOrderByUpMenuSnAscMenuOrdrAsc()).thenReturn(List.of(menu));
        when(navigationGrantRepository.findAllowedMenuIds(List.of("ROLE_ADMIN")))
                .thenReturn(java.util.Set.of(1L)).thenReturn(java.util.Set.of());
        assertThat(menuService.getMenuHierarchy()).hasSize(1);
        assertThat(menuService.getMenuHierarchy()).isEmpty();
    }

    @Test
    void submenuLookupCannotExposeDescendantsOfARevokedAncestor() {
        Menu root=Menu.builder().menuSn(1L).menuNm("Hidden root").build();
        Menu child=Menu.builder().menuSn(2L).menuNm("Child").upMenuSn(1L).build();
        Menu leaf=Menu.builder().menuSn(3L).menuNm("Leaf").upMenuSn(2L).build();
        stubNavigation(List.of(new MenuGrantFixture(root,null),new MenuGrantFixture(child,"ROLE_ADMIN"),
                new MenuGrantFixture(leaf,"ROLE_ADMIN")));
        assertThat(menuService.getMenuHierarchy()).isEmpty();
        assertThat(menuService.getSubMenus(1L)).isEmpty();
        assertThat(menuService.getSubMenus(2L)).isEmpty();
    }

    @Test
    void submenuLookupCannotExposeDescendantsOfAnInactiveAncestor() {
        Menu root=Menu.builder().menuSn(1L).menuNm("Inactive root").useYn("N").build();
        Menu child=Menu.builder().menuSn(2L).menuNm("Child").upMenuSn(1L).build();
        Menu leaf=Menu.builder().menuSn(3L).menuNm("Leaf").upMenuSn(2L).build();
        stubNavigation(List.of(new MenuGrantFixture(root,"ROLE_ADMIN"),new MenuGrantFixture(child,"ROLE_ADMIN"),
                new MenuGrantFixture(leaf,"ROLE_ADMIN")));
        assertThat(menuService.getMenuHierarchy()).isEmpty();
        assertThat(menuService.getSubMenus(2L)).isEmpty();
    }

    @Test
    void brokenAndCyclicParentsStayHiddenWhileIndependentRootsRemainVisible() {
        Menu cycleA=Menu.builder().menuSn(1L).menuNm("Cycle A").upMenuSn(2L).build();
        Menu cycleB=Menu.builder().menuSn(2L).menuNm("Cycle B").upMenuSn(1L).build();
        Menu orphan=Menu.builder().menuSn(3L).menuNm("Missing parent").upMenuSn(99L).build();
        Menu root=Menu.builder().menuSn(4L).menuNm("Valid root").build();
        stubNavigation(List.of(new MenuGrantFixture(cycleA,"ROLE_ADMIN"),new MenuGrantFixture(cycleB,"ROLE_ADMIN"),
                new MenuGrantFixture(orphan,"ROLE_ADMIN"),new MenuGrantFixture(root,"ROLE_ADMIN")));
        assertThat(menuService.getMenuHierarchy()).extracting(MenuDto::getId).containsExactly(4L);
        assertThat(menuService.getSubMenus(1L)).isEmpty();
        assertThat(menuService.getSubMenus(3L)).isEmpty();
    }

    @Test
    void parentAndChildGrantsFromDifferentGroupsAreCombinedBeforeBuildingHierarchy() {
        useGroups("GROUP_PARENT","GROUP_CHILD");
        Menu root=Menu.builder().menuSn(1L).menuNm("Root").build();
        Menu child=Menu.builder().menuSn(2L).menuNm("Child").upMenuSn(1L).build();
        stubNavigation(List.of(new MenuGrantFixture(root,"GROUP_PARENT"),new MenuGrantFixture(child,"GROUP_CHILD")));
        assertThat(menuService.getSubMenus(1L)).extracting(MenuDto::getId).containsExactly(2L);
        useGroups("GROUP_CHILD");
        assertThat(menuService.getSubMenus(1L)).isEmpty();
        useGroups("GROUP_PARENT","GROUP_CHILD");
        assertThat(menuService.getSubMenus(1L)).extracting(MenuDto::getId).containsExactly(2L);
    }

    @Test
    void authenticatedUnknownPrincipalDoesNotInheritAnonymousGroup() {
        when(authentication.getPrincipal()).thenReturn("anonymousUser");
        stubNavigation(List.of(new MenuGrantFixture(Menu.builder().menuSn(1L).build(), "ROLE_ANONYMOUS")));
        assertThat(menuService.getMenuHierarchy()).isEmpty();
        verify(navigationGrantRepository).findAllowedMenuIds(List.of());
    }

    @Test
    void anonymousTokenUsesOnlyAnonymousGroup() {
        when(securityContext.getAuthentication()).thenReturn(new org.springframework.security.authentication.AnonymousAuthenticationToken(
                "test", "anonymousUser", List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ANONYMOUS"))));
        stubNavigation(List.of(new MenuGrantFixture(Menu.builder().menuSn(1L).build(), "ROLE_ANONYMOUS")));
        assertThat(menuService.getMenuHierarchy()).hasSize(1);
    }

    @Test
    void unversionedInvalidOrUnauthorizedGrantReplacementDoesNotMutate() {
        assertThatThrownBy(() -> menuService.insertMenuCreatList("ROLE_USER", "1"))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThatThrownBy(() -> menuService.insertMenuCreatList("ROLE_USER", "1", " "))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThatThrownBy(() -> menuService.insertMenuCreatList("ROLE_USER", "-1", "version-1"))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        when(securityContext.getAuthentication()).thenReturn(null);
        assertThatThrownBy(() -> menuService.insertMenuCreatList("ROLE_USER", "1", "version-1"))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        assertThatThrownBy(() -> menuService.insertMenuManage(MenuDto.builder().menuNm("menu").build()))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        verifyNoInteractions(authorizationAdministrationService, menuRepository);
    }

    @Test
    @DisplayName("getMenuHierarchy - 익명 사용자인 경우 ROLE_ANONYMOUS 권한 적용")
    void getMenuHierarchy_Anonymous() {
        // given
        when(securityContext.getAuthentication()).thenReturn(null);

        Menu menu1 = Menu.builder().menuSn(1L).menuNm("Menu 1").menuOrdr(1).build();
        String auth = "ROLE_ANONYMOUS";

        List<MenuGrantFixture> results = new ArrayList<>();
        results.add(new MenuGrantFixture(menu1, auth));
        stubNavigation(results);
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        // when
        List<MenuDto> hierarchy = menuService.getMenuHierarchy();

        // then
        assertThat(hierarchy).hasSize(1);
    }

    @Test
    @DisplayName("getMenuHierarchy - useYn이 'N'인 메뉴는 필터링됨")
    void getMenuHierarchy_FilterInactiveMenus() {
        // given
        useGroup("ROLE_ADMIN");

        Menu menuActive = Menu.builder().menuSn(1L).menuNm("Active Menu").menuOrdr(1).useYn("Y").build();
        Menu menuInactive = Menu.builder().menuSn(2L).menuNm("Inactive Menu").menuOrdr(2).useYn("N").build();
        
        List<MenuGrantFixture> results = new ArrayList<>();
        results.add(new MenuGrantFixture(menuActive, "ROLE_ADMIN"));
        results.add(new MenuGrantFixture(menuInactive, "ROLE_ADMIN"));
        
        stubNavigation(results);
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        // when
        List<MenuDto> hierarchy = menuService.getMenuHierarchy();

        // then
        assertThat(hierarchy).hasSize(1);
        assertThat(hierarchy.get(0).getMenuNm()).isEqualTo("Active Menu");
    }

    @Test
    @DisplayName("calculateUrl - modernRoute가 있는 경우 우선 적용")
    void calculateUrl_ModernRoute() {
        // given
        Menu menu = Menu.builder().menuSn(1L).modernRoute("/modern").build();
        when(menuRepository.findById(1L)).thenReturn(Optional.of(menu));

        // when
        MenuDto result = menuService.selectMenuManage(1L);

        // then
        assertThat(result.getChkURL()).isEqualTo("/modern");
    }

    @Test
    @DisplayName("calculateUrl - progrmFileNm이 dir/인 경우 # 반환")
    void calculateUrl_Dir() {
        // given
        Menu menu = Menu.builder().menuSn(1L).prgrmFileNm("dir").build();
        when(menuRepository.findById(1L)).thenReturn(Optional.of(menu));

        // when
        MenuDto result = menuService.selectMenuManage(1L);

        // then
        assertThat(result.getChkURL()).isEqualTo("#");
    }



    @Test
    @DisplayName("insertMenuCreatList - 기존 권한 삭제 및 신규 추가")
    void insertMenuCreatList_Success() {
        // when
        menuService.insertMenuCreatList("ROLE_USER", "3,1,2,1", "version-1");

        // then
        verify(authorizationAdministrationService).replaceNavigationGrants("ROLE_USER", List.of(1L, 2L, 3L), "version-1");
    }

    @Test
    @DisplayName("insertMenuCreatList - 빈 문자열인 경우 추가하지 않음")
    void insertMenuCreatList_Empty() {
        // when
        menuService.insertMenuCreatList("ROLE_USER", "", "version-1");

        // then
        verify(authorizationAdministrationService).replaceNavigationGrants("ROLE_USER", List.of(), "version-1");
    }

    @Test
    @DisplayName("updateMenuManage - 존재하지 않는 메뉴 수정 시 예외")
    void updateMenuManage_NotFound() {
        // given
        MenuDto dto = MenuDto.builder().menuNo(99L).build();
        when(menuRepository.findById(99L)).thenReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> menuService.updateMenuManage(dto))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ENTITY_NOT_FOUND);
    }

    @Test
    @DisplayName("getRootIdByProgrmFileNm - 최상위 메뉴 ID 찾기")
    void getRootIdByProgrmFileNm() {
        // given
        Menu menu3 = Menu.builder().menuSn(3L).upMenuSn(2L).prgrmFileNm("Prog3").build();
        Menu menu2 = Menu.builder().menuSn(2L).upMenuSn(1L).build();
        Menu menu1 = Menu.builder().menuSn(1L).upMenuSn(0L).build();

        when(menuRepository.findByPrgrmFileNm("Prog3")).thenReturn(Optional.of(menu3));
        when(menuRepository.findAllByOrderByUpMenuSnAscMenuOrdrAsc()).thenReturn(List.of(menu1, menu2, menu3));

        // when
        Long rootId = menuService.getRootMenuIdByProgrmFileNm("Prog3");

        // then
        assertThat(rootId).isEqualTo(1L);
    }

    @Test
    void hierarchyWriteRejectsSelfParentBeforeChangingFields() {
        Menu node = hierarchyNode(1L, null);
        givenParentGraph(node);

        assertInvalidHierarchy(() -> menuService.updateMenuManage(MenuDto.builder()
                .menuNo(1L).upMenuSn(1L).menuNm("must not change").build()));

        assertThat(node.getUpMenuSn()).isNull();
        assertThat(node.getMenuNm()).isEqualTo("original");
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void hierarchyWriteRejectsTwoNodeCycleInEitherBatchOrder(boolean reverse) {
        Menu first = hierarchyNode(1L, null);
        Menu second = hierarchyNode(2L, null);
        givenParentGraph(first, second);
        var changes = hierarchyChanges(reverse, order(1L, 2L, 2), order(2L, 1L, 3));

        assertInvalidHierarchy(() -> menuService.updateMenuOrders(changes));

        assertThat(first.getUpMenuSn()).isNull();
        assertThat(second.getUpMenuSn()).isNull();
        assertThat(first.getMenuOrdr()).isEqualTo(1);
        assertThat(second.getMenuOrdr()).isEqualTo(1);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void hierarchyWriteRejectsThreeNodeCycleInEitherBatchOrder(boolean reverse) {
        Menu first = hierarchyNode(1L, null);
        Menu second = hierarchyNode(2L, null);
        Menu third = hierarchyNode(3L, null);
        givenParentGraph(first, second, third);

        assertInvalidHierarchy(() -> menuService.updateMenuOrders(hierarchyChanges(reverse,
                order(1L, 2L, 1), order(2L, 3L, 1), order(3L, 1L, 1))));

        assertThat(List.of(first, second, third)).extracting(Menu::getUpMenuSn).containsOnlyNulls();
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void hierarchyWriteValidatesFinalGraphInsteadOfIntermediateBatchState(boolean reverse) {
        Menu first = hierarchyNode(1L, null);
        Menu second = hierarchyNode(2L, 1L);
        givenParentGraph(first, second);

        menuService.updateMenuOrders(hierarchyChanges(reverse, order(1L, 2L, 2), order(2L, 0L, 1)));

        assertThat(first.getUpMenuSn()).isEqualTo(2L);
        assertThat(second.getUpMenuSn()).isNull();
    }

    @Test
    void hierarchyWriteAllowsUnrelatedMoveAndUnchangedLegacyCycleMetadata() {
        Menu first = hierarchyNode(1L, null);
        Menu second = hierarchyNode(2L, null);
        Menu cycleA = hierarchyNode(10L, 11L);
        Menu cycleB = hierarchyNode(11L, 10L);
        givenParentGraph(first, second, cycleA, cycleB);

        menuService.updateMenuManage(MenuDto.builder().menuNo(10L).upMenuSn(11L).menuNm("corrected").build());
        menuService.updateMenuOrders(List.of(order(2L, 1L, 1)));

        assertThat(cycleA.getMenuNm()).isEqualTo("corrected");
        assertThat(cycleA.getUpMenuSn()).isEqualTo(11L);
        assertThat(second.getUpMenuSn()).isEqualTo(1L);
    }

    @Test
    void hierarchyWriteAllowsRepairingExistingCycle() {
        Menu first = hierarchyNode(1L, 2L);
        Menu second = hierarchyNode(2L, 1L);
        givenParentGraph(first, second);

        menuService.updateMenuOrders(List.of(order(1L, null, 1)));

        assertThat(first.getUpMenuSn()).isNull();
        assertThat(second.getUpMenuSn()).isEqualTo(1L);
    }

    @Test
    void hierarchyWriteRejectsMovingIntoExistingCycle() {
        Menu node = hierarchyNode(1L, null);
        givenParentGraph(node, hierarchyNode(10L, 11L), hierarchyNode(11L, 10L));

        assertInvalidHierarchy(() -> menuService.updateMenuManage(order(1L, 10L, 1)));

        assertThat(node.getUpMenuSn()).isNull();
    }

    @Test
    void hierarchyWriteRejectsMissingParentBeforeChangingFields() {
        Menu node = hierarchyNode(1L, null);
        givenParentGraph(node);

        assertInvalidHierarchy(() -> menuService.updateMenuManage(order(1L, 999L, 1)));

        assertThat(node.getUpMenuSn()).isNull();
    }

    @Test
    void hierarchyWriteRejectsMissingParentOnCreateBeforeSaving() {
        givenParentGraph(hierarchyNode(1L, null));
        lenient().when(menuRepository.save(any(Menu.class))).thenReturn(hierarchyNode(100L, 999L));

        assertInvalidHierarchy(() -> menuService.insertMenuManage(MenuDto.builder()
                .menuNm("new").upMenuSn(999L).menuOrdr(1).build()));

        verify(menuRepository, never()).save(any());
        verifyNoInteractions(authorizationAdministrationService);
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void hierarchyWriteRejectsConflictingDuplicatesBeforeChangingFields(boolean conflictingParent) {
        Menu node = hierarchyNode(1L, null);
        givenParentGraph(node, hierarchyNode(2L, null), hierarchyNode(3L, null));
        MenuDto other = conflictingParent ? order(1L, 3L, 2) : order(1L, 2L, 3);

        assertInvalidHierarchy(() -> menuService.updateMenuOrders(List.of(order(1L, 2L, 2), other)));

        assertThat(node.getUpMenuSn()).isNull();
        assertThat(node.getMenuOrdr()).isEqualTo(1);
    }

    @Test
    void hierarchyWriteAcceptsIdenticalDuplicates() {
        Menu node = hierarchyNode(1L, null);
        givenParentGraph(node, hierarchyNode(2L, null));

        menuService.updateMenuOrders(List.of(order(1L, 2L, 3), order(1L, 2L, 3)));

        assertThat(node.getUpMenuSn()).isEqualTo(2L);
        assertThat(node.getMenuOrdr()).isEqualTo(3);
    }

    @Test
    void hierarchyReadSupportsFourLevels() {
        Menu leaf = hierarchyNode(4L, 3L);
        when(menuRepository.findByPrgrmFileNm("deep")).thenReturn(Optional.of(leaf));
        when(menuRepository.findAllByOrderByUpMenuSnAscMenuOrdrAsc()).thenReturn(List.of(
                hierarchyNode(1L, null), hierarchyNode(2L, 1L), hierarchyNode(3L, 2L), leaf));

        assertThat(menuService.getRootMenuIdByProgrmFileNm("deep")).isEqualTo(1L);
    }

    @Test
    void hierarchyReadCycleTerminatesWithoutInventingARoot() {
        Menu first = hierarchyNode(1L, 2L);
        when(menuRepository.findByPrgrmFileNm("cycle")).thenReturn(Optional.of(first));
        when(menuRepository.findAllByOrderByUpMenuSnAscMenuOrdrAsc()).thenReturn(List.of(first, hierarchyNode(2L, 1L)));

        // 旧 구현의 로컬 while은 interrupt를 확인하지 않는다. red는 이 메서드만 별도 JVM에서 실행한다.
        assertTimeoutPreemptively(Duration.ofMillis(300),
                () -> assertThat(menuService.getRootMenuIdByProgrmFileNm("cycle")).isNull());
    }

    private record ParentLinkFixture(Long menuSn, Long upMenuSn) implements MenuRepository.ParentLink {
        @Override public Long getMenuSn() { return menuSn; }
        @Override public Long getUpMenuSn() { return upMenuSn; }
    }

    private void givenParentGraph(Menu... nodes) {
        List<MenuRepository.ParentLink> links = java.util.Arrays.stream(nodes)
                .map(node -> (MenuRepository.ParentLink) new ParentLinkFixture(node.getMenuSn(), node.getUpMenuSn())).toList();
        lenient().when(menuRepository.findParentLinksForUpdate()).thenReturn(links);
        for (Menu node : nodes) {
            lenient().when(menuRepository.findById(node.getMenuSn())).thenReturn(Optional.of(node));
        }
    }

    private static Menu hierarchyNode(Long id, Long parent) {
        return Menu.builder().menuSn(id).upMenuSn(parent).menuNm("original").menuOrdr(1).build();
    }

    private static MenuDto order(Long id, Long parent, int order) {
        return MenuDto.builder().menuNo(id).upMenuSn(parent).menuOrdr(order).build();
    }

    private static List<MenuDto> hierarchyChanges(boolean reverse, MenuDto... changes) {
        var list = new ArrayList<>(List.of(changes));
        if (reverse) Collections.reverse(list);
        return list;
    }

    private static void assertInvalidHierarchy(org.assertj.core.api.ThrowableAssert.ThrowingCallable action) {
        assertThatThrownBy(action).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
    }



    @Test
    @DisplayName("getMenuHierarchy - 예외 발생 시 catch 블록 테스트")
    void getMenuHierarchy_Exception() {
        when(securityContext.getAuthentication()).thenReturn(null);
        when(menuRepository.findAllByOrderByUpMenuSnAscMenuOrdrAsc()).thenThrow(new RuntimeException("DB Error"));

        assertThatThrownBy(() -> menuService.getMenuHierarchy())
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("DB Error");
    }

    @Test
    @DisplayName("getMenuHierarchy - 일반 사용자(ROLE_USER) 권한 일치 필터링 테스트")
    void getMenuHierarchy_NotAdminButAuthorized() {
        useGroup("ROLE_USER");

        Menu menu1 = Menu.builder().menuSn(1L).menuNm("Auth Menu").build();
        Menu menu2 = Menu.builder().menuSn(2L).menuNm("NoAuth Menu").build();
        
        String auth = "ROLE_USER";

        List<MenuGrantFixture> results = new ArrayList<>();
        results.add(new MenuGrantFixture(menu1, auth));
        results.add(new MenuGrantFixture(menu2, null)); // 권한 없음

        stubNavigation(results);
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        List<MenuDto> hierarchy = menuService.getMenuHierarchy();
        assertThat(hierarchy).hasSize(1);
        assertThat(hierarchy.get(0).getMenuNo()).isEqualTo(1L);
    }

    @Test
    @DisplayName("getSubMenus - 특정 rootMenuNo 지정 조회")
    void getSubMenus_Success() {
        when(securityContext.getAuthentication()).thenReturn(null);
        Menu parentMenu = Menu.builder().menuSn(1L).menuNm("Parent Menu").upMenuSn(0L).useYn("Y").build();
        Menu menu1 = Menu.builder().menuSn(2L).menuNm("Child Menu").upMenuSn(1L).useYn("Y").build();
        String authParent = "ROLE_ANONYMOUS";
        String auth = "ROLE_ANONYMOUS";

        List<MenuGrantFixture> results = new ArrayList<>();
        results.add(new MenuGrantFixture(parentMenu, authParent));
        results.add(new MenuGrantFixture(menu1, auth));
        
        stubNavigation(results);
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        List<MenuDto> hierarchy = menuService.getSubMenus(1L);
        assertThat(hierarchy).hasSize(1);
        assertThat(hierarchy.get(0).getMenuNo()).isEqualTo(2L);
    }

    @Test
    @DisplayName("단순 조회 메서드 호출 커버리지")
    void simpleGetterCoverage() {
        Menu menu = Menu.builder().menuSn(1L).upMenuSn(0L).menuOrdr(1).build();
        when(menuRepository.findAllByOrderByUpMenuSnAscMenuOrdrAsc()).thenReturn(List.of(menu));
        
        assertThat(menuService.getAllMenusCached()).hasSize(1);
        assertThat(menuService.getMenuParentMapCached()).containsKey(1L);
        
        when(programRepository.findAll()).thenReturn(Collections.emptyList());
        assertThat(menuService.getAllPrograms()).isEmpty();

        List<nuri.business.service.menu.dto.MenuWithProgramDto> results = new ArrayList<>();
        results.add(new nuri.business.service.menu.dto.MenuWithProgramDto(menu, null));
        when(menuRepository.findAllWithPrograms()).thenReturn(results);
        assertThat(menuService.getAllMenus()).hasSize(1);
    }

    @Test
    @DisplayName("selectMenuCreatManagList - 검색어 있을 때")
    void selectMenuCreatManagList_WithKeyword() {
        nuri.business.domain.common.BaseSearchDto search = new nuri.business.domain.common.BaseSearchDto();
        search.setSearchKeyword("ROLE");
        search.setPageIndex(1);
        search.setRecordCountPerPage(10);
        
        nuri.business.domain.auth.MenuCreatManageProjection proj = mock(nuri.business.domain.auth.MenuCreatManageProjection.class);
        when(proj.getAuthrtCd()).thenReturn("ROLE_USER");
        when(proj.getChkYeoBu()).thenReturn(1L);
        
        org.springframework.data.domain.Page<nuri.business.domain.auth.MenuCreatManageProjection> page = 
            new org.springframework.data.domain.PageImpl<>(List.of(proj));
            
        when(navigationGrantRepository.selectMenuCreatManagList(eq("ROLE"), any())).thenReturn(page);
        
        List<nuri.business.service.menu.dto.MenuCreateDto> list = menuService.selectMenuCreatManagList(search);
        assertThat(list).hasSize(1);
        
        int count = menuService.selectMenuCreatManagTotCnt(search);
        assertThat(count).isEqualTo(1);
    }

    @Test
    @DisplayName("selectMenuCreatList - MenuSn이 null인 Projection 처리 로직")
    void selectMenuCreatList_NullMenuSn() {
        nuri.business.service.menu.dto.MenuCreateDto vo = nuri.business.service.menu.dto.MenuCreateDto.builder().authrtCd("ROLE_USER").build();
        nuri.business.domain.auth.MenuAuthorityProjection proj = mock(nuri.business.domain.auth.MenuAuthorityProjection.class);
        when(proj.getMenuSn()).thenReturn(null); // 강제 null
        when(proj.getRegYn()).thenReturn("Y");
        
        when(navigationGrantRepository.selectMenuCreatList("ROLE_USER")).thenReturn(List.of(proj));
        
        List<nuri.business.service.menu.dto.MenuCreateDto> result = menuService.selectMenuCreatList(vo);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getChkYeoBu()).isEqualTo(1);
    }

    @Test
    @DisplayName("insertMenuManage - 등록된 프로그램만 연결하고 메뉴 번호는 DB에서 생성한다")
    void insertMenuManage_LinksExistingProgram() {
        MenuDto dto = MenuDto.builder()
                .menuNo(9_999_999L)
                .menuNm("테스트 메뉴")
                .prgrmFileNm("NewProgram")
                .modernRoute("/test/new-program")
                .build();
        
        when(programRepository.existsById("NewProgram")).thenReturn(true);
        stubGeneratedMenuId(101L);
        menuService.insertMenuManage(dto);
        verify(programRepository).existsById("NewProgram");
        verify(programRepository, never()).save(any(Program.class));
        ArgumentCaptor<Menu> menuCaptor = ArgumentCaptor.forClass(Menu.class);
        verify(menuRepository).save(menuCaptor.capture());
        assertThat(menuCaptor.getValue().getMenuSn())
                .as("create payload의 수동 menuNo는 무시하고 DB IDENTITY가 번호를 부여해야 한다")
                .isEqualTo(101L);
        verify(authorizationAdministrationService).grantNewMenuToCompatibilityAdmin(101L);
    }

    @Test
    void rejectsUnknownProgramOnCreateAndUpdate() {
        MenuDto dto = MenuDto.builder().menuNo(1L).menuNm("메뉴")
                .prgrmFileNm("missing").modernRoute("/test").build();
        Menu menu = hierarchyNode(1L, null);
        givenParentGraph(menu);

        assertThatThrownBy(() -> menuService.insertMenuManage(dto)).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);
        assertThatThrownBy(() -> menuService.updateMenuManage(dto)).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE);

        assertThat(menu.getMenuNm()).isEqualTo("original");
        assertThat(menu.getPrgrmFileNm()).isNull();
        assertThat(menu.getModernRoute()).isNull();
        assertThat(menu.getUpMenuSn()).isNull();
        assertThat(menu.getMenuOrdr()).isEqualTo(1);
        verify(menuRepository, never()).save(any());
        verify(programRepository, never()).save(any());
        verifyNoInteractions(authorizationAdministrationService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"update", "order", "delete", "deleteList"})
    @DisplayName("메뉴 쓰기는 해당 권한이 없으면 전체 요청을 거부하고 메뉴·배정을 바꾸지 않는다")
    void menuWritesRejectMissingOperationPermissionBeforeAnyChange(String operation) {
        String requiredPermission = operation.startsWith("delete") ? "MENU_DELETE" : "MENU_UPDATE";
        usePrincipal(CustomUserDetails.builder().userId("tester").esntlId("TESTER_001")
                .groups(List.of("ROLE_ADMIN"))
                .permissions(List.of("MENU_CREATE", "MENU_UPDATE", "MENU_DELETE", "AUTHRT_GRANT").stream()
                        .filter(permission -> !permission.equals(requiredPermission)).toList())
                .enabled(true).build());
        Menu first = hierarchyNode(1L, null);
        Menu second = hierarchyNode(2L, null);
        givenParentGraph(first, second);
        lenient().when(menuRepository.findForUpdateByMenuSnIn(anyList())).thenAnswer(invocation -> {
            List<Long> ids = invocation.getArgument(0);
            return List.of(first, second).stream().filter(menu -> ids.contains(menu.getMenuSn())).toList();
        });
        Runnable action = switch (operation) {
            case "update" -> () -> menuService.updateMenuManage(MenuDto.builder().menuNo(1L)
                    .menuNm("must not change").upMenuSn(2L).menuOrdr(9).build());
            case "order" -> () -> menuService.updateMenuOrders(List.of(order(1L, 2L, 9), order(2L, null, 8)));
            case "delete" -> () -> menuService.deleteMenuManage(MenuDto.builder().menuNo(1L).build());
            case "deleteList" -> () -> menuService.deleteMenuManageList("1,2");
            default -> throw new IllegalArgumentException(operation);
        };

        assertThatThrownBy(action::run).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);

        for (Menu menu : List.of(first, second)) {
            assertThat(menu.getMenuNm()).isEqualTo("original");
            assertThat(menu.getUpMenuSn()).isNull();
            assertThat(menu.getMenuOrdr()).isEqualTo(1);
        }
        verifyNoInteractions(menuRepository, programRepository, authorizationAdministrationService,
                navigationGrantRepository);
    }

    @Test
    void createsIndependentRouteWithoutProgram() {
        stubGeneratedMenuId(102L);
        menuService.insertMenuManage(MenuDto.builder().menuNm("독립 메뉴").modernRoute("/test").build());
        ArgumentCaptor<Menu> captured = ArgumentCaptor.forClass(Menu.class);
        verify(menuRepository).save(captured.capture());
        assertThat(captured.getValue().getPrgrmFileNm()).isNull();
        assertThat(captured.getValue().getModernRoute()).isEqualTo("/test");
        verifyNoInteractions(programRepository);
    }

    @Test
    @DisplayName("updateMenuManage - 성공")
    void updateMenuManage_Success() {
        MenuDto dto = MenuDto.builder().menuNo(1L).menuNm("Updated").build();
        Menu menu = mock(Menu.class);
        when(menuRepository.findParentLinksForUpdate()).thenReturn(List.of(new ParentLinkFixture(1L, null)));
        when(menuRepository.findById(1L)).thenReturn(Optional.of(menu));
        
        menuService.updateMenuManage(dto);
        
        verify(menu).updateWithModernRoute(eq("Updated"), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("deleteMenuManageList - 체크된 번호 삭제")
    void deleteMenuManageList_Valid() {
        when(menuRepository.findForUpdateByMenuSnIn(anyList())).thenAnswer(invocation -> {
            List<Long> requested = invocation.getArgument(0);
            return requested.stream().map(id -> Menu.builder().menuSn(id).build()).toList();
        });
        menuService.deleteMenuManageList("1,2,,3"); // 빈 값 포함
        verify(menuRepository).deleteAllById(List.of(1L, 2L, 3L));
        verify(authorizationAdministrationService).removeNavigationGrantsForMenus(List.of(1L, 2L, 3L));
        
        menuService.deleteMenuManageList(null); // 조기 리턴 분기
        menuService.deleteMenuManage(MenuDto.builder().menuNo(1L).build());
        verify(menuRepository).deleteById(1L);
        verify(authorizationAdministrationService).removeNavigationGrantsForMenus(List.of(1L));
    }

    @Test
    @DisplayName("getRootMenuIdByUrl - 엣지 케이스 테스트")
    void getRootMenuIdByUrl_Edges() {
        assertThat(menuService.getRootMenuIdByUrl(null)).isNull();
        
        when(programRepository.findByUrl("/test")).thenReturn(Optional.empty());
        assertThat(menuService.getRootMenuIdByUrl("/test")).isNull();
        
        assertThat(menuService.getRootMenuIdByProgrmFileNm(null)).isNull();
        when(menuRepository.findByPrgrmFileNm("NotFound")).thenReturn(Optional.empty());
        assertThat(menuService.getRootMenuIdByProgrmFileNm("NotFound")).isNull();
    }

    @Test
    @DisplayName("buildMenuTree - 루트 메뉴 필터링 엣지 케이스")
    void buildMenuTree_RootMenuFilteringEdges() {
        useGroup("ROLE_ADMIN");

        Menu menuMax = Menu.builder().menuSn(10000000L).menuNm("Max Menu").useYn("Y").build();
        Menu menuNullUpper = Menu.builder().menuSn(1L).menuNm("Null Upper").upMenuSn(null).useYn("Y").build();
        Menu menuZeroUpper = Menu.builder().menuSn(2L).menuNm("Zero Upper").upMenuSn(0L).useYn("Y").build();
        Menu menuNormal = Menu.builder().menuSn(3L).menuNm("Normal").upMenuSn(1L).useYn("Y").build();
        Menu menuOrphan = Menu.builder().menuSn(4L).menuNm("Orphan").upMenuSn(99L).useYn("Y").build(); // dtoMap doesn't contain upper

        List<MenuGrantFixture> results = new ArrayList<>();
        results.add(new MenuGrantFixture(menuMax, "ROLE_ADMIN"));
        results.add(new MenuGrantFixture(menuNullUpper, "ROLE_ADMIN"));
        results.add(new MenuGrantFixture(menuZeroUpper, "ROLE_ADMIN"));
        results.add(new MenuGrantFixture(menuNormal, "ROLE_ADMIN"));
        results.add(new MenuGrantFixture(menuOrphan, "ROLE_ADMIN"));

        stubNavigation(results);
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        List<MenuDto> hierarchy = menuService.getMenuHierarchy();
        // 자동 BIGINT는 7자리 상한과 무관하다. High-ID, Null Upper, Zero Upper가 모두 루트다.
        assertThat(hierarchy).hasSize(3);
    }

    @Test
    @DisplayName("buildMenuTree - 특정 rootMenuNo 지정 및 Orphan 테스트")
    void buildMenuTree_SpecificRootMenuNo() {
        when(securityContext.getAuthentication()).thenReturn(null);
        
        Menu parentMenu = Menu.builder().menuSn(1L).menuNm("Parent Menu").upMenuSn(0L).useYn("Y").build();
        Menu menuChild = Menu.builder().menuSn(2L).menuNm("Child Menu").upMenuSn(1L).useYn("Y").build();
        Menu menuOrphan = Menu.builder().menuSn(3L).menuNm("Orphan").upMenuSn(99L).useYn("Y").build(); // 상위 메뉴 없음
        Menu menuSubChild = Menu.builder().menuSn(4L).menuNm("Sub Child").upMenuSn(2L).useYn("Y").build(); // 하위의 하위

        String authParent = "ROLE_ANONYMOUS";
        String auth = "ROLE_ANONYMOUS";
        String authOrphan = "ROLE_ANONYMOUS";
        String authSubChild = "ROLE_ANONYMOUS";

        List<MenuGrantFixture> results = new ArrayList<>();
        results.add(new MenuGrantFixture(parentMenu, authParent));
        results.add(new MenuGrantFixture(menuChild, auth));
        results.add(new MenuGrantFixture(menuOrphan, authOrphan));
        results.add(new MenuGrantFixture(menuSubChild, authSubChild));
        
        stubNavigation(results);
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        List<MenuDto> hierarchy = menuService.getSubMenus(1L);
        assertThat(hierarchy).hasSize(1);
        assertThat(hierarchy.get(0).getMenuNo()).isEqualTo(2L);
        assertThat(hierarchy.get(0).getChildren()).hasSize(1);
        assertThat(hierarchy.get(0).getChildren().get(0).getMenuNo()).isEqualTo(4L);
    }

    @Test
    @DisplayName("insertMenuCreatList - null 체크 및 빈 요소 무시")
    void insertMenuCreatList_Edges() {
        menuService.insertMenuCreatList("ROLE_USER", null, "version-1");
        verify(authorizationAdministrationService).replaceNavigationGrants("ROLE_USER", List.of(), "version-1");

        menuService.insertMenuCreatList("ROLE_USER", ",,", "version-2");
        verify(authorizationAdministrationService).replaceNavigationGrants("ROLE_USER", List.of(), "version-2");
    }
    
    @Test
    @DisplayName("getAllMenus - calculateUrl에서 programMap 사용 테스트")
    void getAllMenus_calculateUrlWithProgramMap() {
        Menu menu = Menu.builder().menuSn(1L).prgrmFileNm("Prog").build();
        Program program = Program.builder().prgrmFileNm("Prog").url("/new/url").build();
        
        List<nuri.business.service.menu.dto.MenuWithProgramDto> results = new ArrayList<>();
        results.add(new nuri.business.service.menu.dto.MenuWithProgramDto(menu, program));
        
        when(menuRepository.findAllWithPrograms()).thenReturn(results);
        
        List<MenuDto> menus = menuService.getAllMenus();
        assertThat(menus).hasSize(1);
        assertThat(menus.get(0).getChkURL()).isEqualTo("/new/url");
    }
    

    
    @Test
    @DisplayName("calculateUrl - url이 / 인 경우")
    void calculateUrl_RootUrl() {
        Menu menu = Menu.builder().menuSn(1L).prgrmFileNm("Prog").build();
        Program program = Program.builder().prgrmFileNm("Prog").url("/").build();
        
        when(menuRepository.findById(1L)).thenReturn(Optional.of(menu));
        when(programRepository.findById("Prog")).thenReturn(Optional.of(program));
        
        MenuDto result = menuService.selectMenuManage(1L);
        assertThat(result.getChkURL()).isEqualTo("#"); 
    }
    
    @Test
    @DisplayName("calculateUrl - prgrmFileNm이 / 인 경우")
    void calculateUrl_PrgrmFileNmRoot() {
        Menu menu = Menu.builder().menuSn(1L).prgrmFileNm("/").build();
        when(menuRepository.findById(1L)).thenReturn(Optional.of(menu));
        
        MenuDto result = menuService.selectMenuManage(1L);
        assertThat(result.getChkURL()).isEqualTo("#"); 
    }

    @Test
    @DisplayName("selectMenuCreatManagList - null 키워드 처리")
    void selectMenuCreatManagList_NullKeyword() {
        nuri.business.domain.common.BaseSearchDto search = new nuri.business.domain.common.BaseSearchDto();
        search.setSearchKeyword(null);
        search.setPageIndex(1);
        search.setRecordCountPerPage(10);
        
        org.springframework.data.domain.Page<nuri.business.domain.auth.MenuCreatManageProjection> page = 
            new org.springframework.data.domain.PageImpl<>(Collections.emptyList());
            
        when(navigationGrantRepository.selectMenuCreatManagList(eq(""), any())).thenReturn(page);
        
        List<nuri.business.service.menu.dto.MenuCreateDto> list = menuService.selectMenuCreatManagList(search);
        assertThat(list).isEmpty();
        
        int count = menuService.selectMenuCreatManagTotCnt(search);
        assertThat(count).isEqualTo(0);
    }

    @Test
    @DisplayName("getSubMenus - rootMenuNo가 null 이거나 <= 0 인 경우")
    void getSubMenus_NullOrZero() {
        useGroup("ROLE_ADMIN");

        Menu menu1 = Menu.builder().menuSn(1L).menuNm("Menu 1").menuOrdr(1).useYn("Y").build();
        List<MenuGrantFixture> results = new ArrayList<>();
        results.add(new MenuGrantFixture(menu1, "ROLE_ADMIN"));
        stubNavigation(results);
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        assertThat(menuService.getSubMenus(null)).hasSize(1);
        assertThat(menuService.getSubMenus(0L)).hasSize(1);
        assertThat(menuService.getSubMenus(-1L)).hasSize(1);
    }

    @Test
    @DisplayName("getSubMenus - 찾지 못하는 rootMenuNo 인 경우")
    void getSubMenus_NotFound() {
        useGroup("ROLE_ADMIN");

        Menu menu1 = Menu.builder().menuSn(1L).menuNm("Menu 1").menuOrdr(1).useYn("Y").build();
        List<MenuGrantFixture> results = new ArrayList<>();
        results.add(new MenuGrantFixture(menu1, "ROLE_ADMIN"));
        stubNavigation(results);
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        assertThat(menuService.getSubMenus(999L)).isEmpty();
    }

    @Test
    @DisplayName("getSubMenus - Children이 Null인 MenuDto 반환")
    void getSubMenus_ChildrenNull() {
        useGroup("ROLE_ADMIN");

        Menu menu1 = Menu.builder().menuSn(1L).menuNm("Menu 1").menuOrdr(1).useYn("Y").build();
        List<MenuGrantFixture> results = new ArrayList<>();
        results.add(new MenuGrantFixture(menu1, "ROLE_ADMIN"));
        stubNavigation(results);
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        List<MenuDto> subMenus = menuService.getSubMenus(1L);
        assertThat(subMenus).isEmpty(); // getChildren이 null 이면 new ArrayList<>() 반환
    }



    @Test
    @DisplayName("deleteMenuManageList - null 이나 비어있는 문자열 처리")
    void deleteMenuManageList_Empty() {
        menuService.deleteMenuManageList(null);
        menuService.deleteMenuManageList("");
        menuService.deleteMenuManageList("   ");
        
        verify(menuRepository, never()).deleteAllById(any());
    }

    @Test
    @DisplayName("insertMenuCreatList - split 후 trim 처리 빈문자열 무시")
    void insertMenuCreatList_TrimmedEmpty() {
        menuService.insertMenuCreatList("ROLE_USER", "1, , 3,", "version-1");
        verify(authorizationAdministrationService).replaceNavigationGrants("ROLE_USER", List.of(1L, 3L), "version-1");
    }

    @Test
    @DisplayName("전체 메뉴 및 프로그램 정보 목록 조회")
    void getAllMenus() {
        Menu menu = Menu.builder().menuSn(1L).menuNm("M1").prgrmFileNm("P1").build();
        Program program = Program.builder().prgrmFileNm("P1").url("/p1").build();
        when(menuRepository.findAllWithPrograms()).thenReturn(List.of(new nuri.business.service.menu.dto.MenuWithProgramDto(menu, program)));

        List<MenuDto> result = menuService.getAllMenus();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMenuNm()).isEqualTo("M1");
        assertThat(result.get(0).getChkURL()).isEqualTo("/p1");
    }

    @Test
    @DisplayName("메뉴 부모 맵 캐시 데이터 조회")
    void getMenuParentMapCached() {
        Menu menu1 = Menu.builder().menuSn(2L).upMenuSn(1L).build();
        when(menuRepository.findAllByOrderByUpMenuSnAscMenuOrdrAsc()).thenReturn(List.of(menu1));

        Map<Long, Long> parentMap = menuService.getMenuParentMapCached();
        assertThat(parentMap).containsEntry(2L, 1L);
    }

    @Test
    @DisplayName("[DIP B5 F2] 즐겨찾기가 쓰는 메뉴 배정 판정은 인증 주체의 그룹으로 조회한다")
    void allowedMenuIdsForCurrentUserUsesPrincipalGroups() {
        useGroups("GROUP_STAFF", "GROUP_AUDIT");
        when(navigationGrantRepository.findAllowedMenuIds(List.of("GROUP_AUDIT", "GROUP_STAFF"))).thenReturn(java.util.Set.of(7L));

        assertThat(menuService.allowedMenuIdsForCurrentUser()).containsExactly(7L);
    }
}
