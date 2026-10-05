package nuri.business.service.menu;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.business.domain.menu.NavigationGrantRepository;
import nuri.business.service.auth.AuthorizationAdministrationService;
import nuri.business.security.audit.LoginUserAuditorAware;
import nuri.foundation.security.service.CustomUserDetails;
import nuri.business.domain.menu.Menu;
import nuri.business.domain.menu.MenuRepository;
import nuri.business.service.menu.dto.MenuDto;
import nuri.business.service.auth.dto.AuthorizationDto.GroupVersion;
import nuri.business.service.auth.dto.AuthorizationDto.NavigationConflict;
import nuri.business.service.auth.dto.AuthorizationDto.ResolvedGrantChange;
import nuri.business.service.menu.dto.MenuStructureDto.MenuCreation;
import nuri.business.service.menu.dto.MenuStructureDto.MenuGroupGrantChange;
import nuri.business.service.menu.dto.MenuStructureDto.MenuPlacement;
import nuri.business.service.menu.dto.MenuStructureDto.MenuProperties;
import nuri.business.service.menu.dto.MenuStructureDto.MenuStructureItem;
import nuri.business.service.menu.dto.MenuStructureDto.MenuStructureSave;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MenuService 단위 테스트")
class MenuServiceTest {

    @Mock
    private MenuRepository menuRepository;

    @Mock
    private NavigationGrantRepository navigationGrantRepository;

    @Mock
    private AuthorizationAdministrationService authorizationAdministrationService;

    @Spy
    private LoginUserAuditorAware loginUserAuditorAware = new LoginUserAuditorAware();

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
    @DisplayName("시작 라우트 보강 - 레거시 파일명으로만 추정하고, 추정할 수 없는 메뉴와 폴더는 그대로 둔다")
    void startupRouteMigrationInfersOnlyFromLegacyFileName() {
        // [2026-10-04 프로그램 목록 퇴역] LegacyQuestion 은 종전에 프로그램 원장의 레거시 URL 로 /admin/help/faq 를 얻었다.
        // 원장 조회를 걷었으므로 이제 이름으로 추정할 수 없는 메뉴는 채우지 않는다.
        Menu legacy = Menu.builder().menuSn(1L).prgrmFileNm("LegacyQuestion").build();
        Menu byName = Menu.builder().menuSn(2L).prgrmFileNm("BoardManage").build();
        Menu folder = Menu.builder().menuSn(4L).build();
        when(menuRepository.findAllWithoutModernRoute()).thenReturn(List.of(legacy, byName, folder));

        assertThatCode(menuService::migrateModernRoutes).doesNotThrowAnyException();

        verify(menuRepository).fillModernRouteIfUnchanged(eq(2L), eq("BoardManage"), eq("/admin/community/boards"),
                any(java.time.LocalDateTime.class), eq("tester"));
        assertThat(byName.getModernRoute()).as("조회 스냅샷은 직접 변경하지 않는다").isNull();
        assertThat(legacy.getModernRoute()).isNull();
        assertThat(folder.getModernRoute()).isNull();
        verify(menuRepository, never()).save(any(Menu.class));
        verify(menuRepository, never()).fillModernRouteIfUnchanged(eq(1L), any(), any(), any(), any());
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
    @DisplayName("insertMenuManage - 빈 연결 프로그램은 연결 없음이고 메뉴 번호는 DB에서 생성한다")
    void insertMenuManage_BlankProgramMeansNoLinkAndDbGeneratesId() {
        MenuDto dto = MenuDto.builder()
                .menuNo(9_999_999L)
                .menuNm("테스트 메뉴")
                .prgrmFileNm("")
                .modernRoute("/test/new-menu")
                .build();

        stubGeneratedMenuId(101L);
        menuService.insertMenuManage(dto);
        ArgumentCaptor<Menu> menuCaptor = ArgumentCaptor.forClass(Menu.class);
        verify(menuRepository).save(menuCaptor.capture());
        assertThat(menuCaptor.getValue().getMenuSn())
                .as("create payload의 수동 menuNo는 무시하고 DB IDENTITY가 번호를 부여해야 한다")
                .isEqualTo(101L);
        assertThat(menuCaptor.getValue().getPrgrmFileNm()).as("빈 문자열을 그대로 저장하면 외래 키 위반이다").isNull();
        verify(authorizationAdministrationService).grantNewMenuToCompatibilityAdmin(101L);
    }

    /**
     * [2026-10-04 프로그램 목록 퇴역] 원장을 채우는 화면·API 를 걷었으므로 메뉴를 프로그램에 새로 연결하지 않는다.
     * 종전에는 원장에 있는 프로그램이면 연결을 허용했다 — 그 분기를 되살리면 이 테스트가 실패한다.
     */
    @ParameterizedTest
    @ValueSource(strings = {"EgovBBSMaster", " Legacy "})
    void rejectsProgramLinkOnCreateAndUpdate(String prgrmFileNm) {
        MenuDto dto = MenuDto.builder().menuNo(1L).menuNm("메뉴")
                .prgrmFileNm(prgrmFileNm).modernRoute("/test").build();
        Menu menu = hierarchyNode(1L, null);
        givenParentGraph(menu);

        assertThatThrownBy(() -> menuService.insertMenuManage(dto)).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining("연결 프로그램을 지정할 수 없습니다");
        assertThatThrownBy(() -> menuService.updateMenuManage(dto)).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining("연결 프로그램을 지정할 수 없습니다");

        assertThat(menu.getMenuNm()).isEqualTo("original");
        assertThat(menu.getPrgrmFileNm()).isNull();
        assertThat(menu.getModernRoute()).isNull();
        assertThat(menu.getUpMenuSn()).isNull();
        assertThat(menu.getMenuOrdr()).isEqualTo(1);
        verify(menuRepository, never()).save(any());
        verifyNoInteractions(authorizationAdministrationService);
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "  "})
    @DisplayName("updateMenuManage - 연결 프로그램 없이 저장하면 남아 있던 레거시 연결을 걷는다")
    void updateWithoutProgramClearsLegacyLink(String blank) {
        Menu menu = Menu.builder().menuSn(1L).menuNm("original").menuOrdr(1).prgrmFileNm("EgovLegacy").build();
        givenParentGraph(menu);

        menuService.updateMenuManage(MenuDto.builder().menuNo(1L).menuNm("renamed").prgrmFileNm(blank).build());
        assertThat(menu.getMenuNm()).isEqualTo("renamed");
        assertThat(menu.getPrgrmFileNm()).as("레거시 연결은 값 없이 저장해 걷는다").isNull();

        Menu other = Menu.builder().menuSn(2L).menuNm("other").menuOrdr(1).prgrmFileNm("EgovLegacy").build();
        givenParentGraph(other);
        menuService.updateMenuManage(MenuDto.builder().menuNo(2L).menuNm("other").build());
        assertThat(other.getPrgrmFileNm()).as("필드를 보내지 않아도 연결은 남지 않는다").isNull();
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
        verifyNoInteractions(menuRepository, authorizationAdministrationService,
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
    @DisplayName("getAllMenus - 경로가 없으면 레거시 파일명으로 추정하고, 추정할 수 없으면 / 를 싣는다")
    void getAllMenus_calculateUrlFromLegacyFileName() {
        Menu inferred = Menu.builder().menuSn(1L).prgrmFileNm("EgovMenuList").build();
        Menu unknown = Menu.builder().menuSn(2L).prgrmFileNm("Prog").build();
        when(menuRepository.findAllByOrderByUpMenuSnAscMenuOrdrAsc()).thenReturn(List.of(inferred, unknown));

        List<MenuDto> menus = menuService.getAllMenus();
        assertThat(menus).extracting(MenuDto::getChkURL).containsExactly("/admin/system/menus", "/");
        assertThat(menus).extracting(MenuDto::getPrgrmFileNm).containsExactly("EgovMenuList", "Prog");
        // 관리 목록도 같은 저장소 순서와 경로 계산을 쓴다(종전에는 둘 다 프로그램 원장을 조인해 읽었다).
        assertThat(menuService.selectMenuManageList(new nuri.business.domain.common.BaseSearchDto()))
                .extracting(MenuDto::getMenuNo, MenuDto::getChkURL)
                .containsExactly(org.assertj.core.groups.Tuple.tuple(1L, "/admin/system/menus"), org.assertj.core.groups.Tuple.tuple(2L, "/"));
    }

    @Test
    @DisplayName("calculateUrl - 프로그램 원장을 읽지 않는다: 추정할 수 없는 레거시 파일명은 / 다")
    void calculateUrl_UnknownLegacyFileName() {
        // [2026-10-04 프로그램 목록 퇴역] 종전에는 원장의 URL('/'→'#', '/x'→'/x')을 썼다. 원장에 그 프로그램이 없을 때의 값을 유지한다.
        Menu menu = Menu.builder().menuSn(1L).prgrmFileNm("Prog").build();
        when(menuRepository.findById(1L)).thenReturn(Optional.of(menu));

        MenuDto result = menuService.selectMenuManage(1L);
        assertThat(result.getChkURL()).isEqualTo("/");
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
    @DisplayName("전체 메뉴 목록 조회 - 경로가 있으면 경로를 싣는다")
    void getAllMenus() {
        Menu menu = Menu.builder().menuSn(1L).menuNm("M1").modernRoute("/p1").build();
        when(menuRepository.findAllByOrderByUpMenuSnAscMenuOrdrAsc()).thenReturn(List.of(menu));

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

    // ── [2026-10-02 D1·D2] 메뉴 구조 읽기·저장 ─────────────────────────────────────────────────

    private record StructureRowFixture(Long menuSn, Long upMenuSn, Integer menuOrdr, String menuNm, String useYn,
                                       String modernRoute, String menuExpln, String prgrmFileNm) implements MenuRepository.StructureRow {
        @Override public Long getMenuSn() { return menuSn; }
        @Override public Long getUpMenuSn() { return upMenuSn; }
        @Override public Integer getMenuOrdr() { return menuOrdr; }
        @Override public String getMenuNm() { return menuNm; }
        @Override public String getUseYn() { return useYn; }
        @Override public String getModernRoute() { return modernRoute; }
        @Override public String getMenuExpln() { return menuExpln; }
        @Override public String getPrgrmFileNm() { return prgrmFileNm; }
    }

    private final Map<Long, Menu> structureMenus = new java.util.LinkedHashMap<>();
    private List<MenuRepository.StructureRow> structureRows = List.of();

    private static StructureRowFixture structureRow(long id, Long parent, int order, String name) {
        return new StructureRowFixture(id, parent, order, name, "Y", null, null, null);
    }

    /** 1 Root A ─ 2 Child A1 ─ 3 Leaf A1a, 4 Root B ─ 5 Child B1. 돌려주는 값은 그 구조의 버전이다. */
    private String givenStructure(StructureRowFixture... extra) {
        var rows = new ArrayList<MenuRepository.StructureRow>(List.of(structureRow(1, null, 1, "Root A"),
                structureRow(2, 1L, 1, "Child A1"), structureRow(3, 2L, 1, "Leaf A1a"),
                structureRow(4, null, 2, "Root B"), structureRow(5, 4L, 1, "Child B1")));
        rows.addAll(List.of(extra));
        for (var row : rows) {
            structureMenus.put(row.getMenuSn(), Menu.builder().menuSn(row.getMenuSn()).upMenuSn(row.getUpMenuSn())
                    .menuOrdr(row.getMenuOrdr()).menuNm(row.getMenuNm()).useYn(row.getUseYn()).build());
        }
        structureRows = List.copyOf(rows);
        lenient().when(menuRepository.findStructureRowsForUpdate()).thenReturn(rows);
        lenient().when(menuRepository.findStructureRows()).thenReturn(rows);
        lenient().when(menuRepository.findAllById(any())).thenAnswer(invocation -> {
            Iterable<Long> ids = invocation.getArgument(0);
            var found = new ArrayList<Menu>();
            ids.forEach(id -> { if (structureMenus.containsKey(id)) found.add(structureMenus.get(id)); });
            return found;
        });
        return MenuStructurePlan.versionOf(rows);
    }

    private void stubGeneratedMenuIds(long first) {
        var next = new java.util.concurrent.atomic.AtomicLong(first);
        when(menuRepository.save(any(Menu.class))).thenAnswer(invocation -> {
            Menu row = invocation.getArgument(0);
            org.springframework.test.util.ReflectionTestUtils.setField(row, "menuSn", next.getAndIncrement());
            return row;
        });
    }

    private static MenuStructureSave structureSave(String version, List<MenuCreation> creations, List<MenuPlacement> placements,
            List<MenuProperties> properties, List<Long> deletions, List<MenuGroupGrantChange> grants) {
        return new MenuStructureSave(version, creations, placements, properties, deletions, grants);
    }

    private static MenuStructureSave placementsOnly(String version, MenuPlacement... placements) {
        return structureSave(version, List.of(), List.of(placements), List.of(), List.of(), List.of());
    }

    private static void assertInvalidStructure(org.assertj.core.api.ThrowableAssert.ThrowingCallable action, String message) {
        assertThatThrownBy(action).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.INVALID_INPUT_VALUE)
                .hasMessageContaining(message);
    }

    @Test
    @DisplayName("[D1] 메뉴 구조는 캐시가 아니라 DB 행에서 읽고, 루트 먼저·순서·번호 순으로 싣는다")
    void structureReadSortsRootsFirstAndNormalizesZeroParents() {
        var rows = List.<MenuRepository.StructureRow>of(
                new StructureRowFixture(9L, 0L, 1, "Zero parent root", "N", "", "설명", "dir"),
                new StructureRowFixture(3L, 1L, 2, "Second child", "Y", "/b", null, null),
                new StructureRowFixture(2L, 1L, 1, "First child", "Y", "/a?tab=x", null, null),
                new StructureRowFixture(1L, null, 1, "Root", "Y", null, null, null));
        when(menuRepository.findStructureRows()).thenReturn(rows);

        var structure = menuService.getMenuStructure();

        assertThat(structure.menus()).extracting(item -> item.menuNo()).containsExactly(1L, 9L, 2L, 3L);
        assertThat(structure.menus().get(1).upMenuSn()).as("0 상위는 루트다").isNull();
        assertThat(structure.menus().get(1)).isEqualTo(new MenuStructureItem(9L, "Zero parent root", null, 1, "", "설명", "N", "dir"));
        assertThat(structure.version()).hasSize(64).isEqualTo(MenuStructurePlan.versionOf(rows));
        verify(menuRepository, never()).findAllByOrderByUpMenuSnAscMenuOrdrAsc();
        verify(menuRepository, never()).findStructureRowsForUpdate();
    }

    @Test
    @DisplayName("[D1] 구조 버전은 여덟 칸 어디가 바뀌어도 달라지고, null 과 빈 문자열·구분자 위치를 구분한다")
    void structureVersionCoversEveryColumnUnambiguously() {
        var base = new StructureRowFixture(1L, null, 1, "a|b", "Y", null, "c", "p");
        String version = MenuStructurePlan.versionOf(List.of(base));
        var variants = List.of(
                new StructureRowFixture(1L, 2L, 1, "a|b", "Y", null, "c", "p"),
                new StructureRowFixture(1L, null, 2, "a|b", "Y", null, "c", "p"),
                new StructureRowFixture(1L, null, 1, "a", "Y", null, "c", "p"),
                new StructureRowFixture(1L, null, 1, "a|b", "N", null, "c", "p"),
                new StructureRowFixture(1L, null, 1, "a|b", "Y", "", "c", "p"),
                new StructureRowFixture(1L, null, 1, "a|b", "Y", null, null, "p"),
                new StructureRowFixture(1L, null, 1, "a|b", "Y", null, "c", null),
                new StructureRowFixture(1L, null, 1, "a", "Y", "|b", "c", "p"));
        for (var variant : variants) assertThat(MenuStructurePlan.versionOf(List.of(variant))).isNotEqualTo(version);
        assertThat(MenuStructurePlan.versionOf(List.of(base))).isEqualTo(version);
    }

    @Test
    @DisplayName("[D2] 구조 버전이 다르면 409 이고 메뉴·권한을 바꾸지 않는다")
    void structureSaveRejectsStaleVersionBeforeAnyChange() {
        givenStructure();
        assertThatThrownBy(() -> menuService.saveMenuStructure(placementsOnly("stale", new MenuPlacement("5", "1", 1))))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION)
                .hasMessageContaining("메뉴 구조가 다른 곳에서 바뀌었습니다");
        assertThat(structureMenus.get(5L).getUpMenuSn()).isEqualTo(4L);
        verify(menuRepository, never()).findAllById(any());
        verify(menuRepository, never()).save(any());
        verifyNoInteractions(authorizationAdministrationService);
    }

    @Test
    @DisplayName("[D2] 버전과 삭제 판정은 잠근 뒤 새로 읽은 행으로 한다 — 잠금을 기다리는 사이 커밋된 새 하위가 있으면 409 이고 지우지 않는다")
    void structureSaveJudgesRowsReadAfterTheLockNotTheLockingSnapshot() {
        String version = givenStructure();
        // 잠금 문장의 결과(시작 시점 스냅샷)에는 없지만, 잠금을 쥔 뒤 새로 읽으면 Root B 아래 새 메뉴 6 이 보인다.
        var fresh = new ArrayList<>(structureRows);
        fresh.add(structureRow(6, 4L, 2, "Committed while waiting"));
        when(menuRepository.findStructureRows()).thenReturn(fresh);

        assertThatThrownBy(() -> menuService.saveMenuStructure(structureSave(version, List.of(), List.of(), List.of(),
                List.of(4L, 5L), List.of())))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION);
        var order = inOrder(menuRepository);
        order.verify(menuRepository).findStructureRowsForUpdate();
        order.verify(menuRepository).findStructureRows();
        verify(menuRepository, never()).deleteAllById(any());
        verifyNoInteractions(authorizationAdministrationService);
    }

    @Test
    @DisplayName("[D2] 지우기 직전 새 문장으로 센 하위가 삭제 집합 밖에 있으면 409 이고 지우지 않는다")
    void structureSaveRecountsChildrenRightBeforeDeleting() {
        String version = givenStructure();
        when(menuRepository.countByUpMenuSnAndMenuSnNotIn(4L, List.of(4L, 5L))).thenReturn(1);

        assertThatThrownBy(() -> menuService.saveMenuStructure(structureSave(version, List.of(), List.of(), List.of(),
                List.of(5L, 4L), List.of())))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.CONCURRENT_MODIFICATION)
                .hasMessageContaining("메뉴 구조가 다른 곳에서 바뀌었습니다");
        verify(authorizationAdministrationService, never()).removeNavigationGrantsForMenus(anyList());
        verify(menuRepository, never()).deleteAllById(any());
    }

    @Test
    @DisplayName("[D2] 옮긴 메뉴와 그 하위가 3단계를 넘으면 거부하고, 무관한 기존 위반은 저장을 막지 않는다")
    void structureSaveEnforcesDepthOnlyForMovedSubtrees() {
        String version = givenStructure(structureRow(6, 3L, 1, "Legacy depth four"));
        // 2(하위 3·6 포함)를 5 아래로 옮기면 6 이 5단계가 된다.
        assertInvalidStructure(() -> menuService.saveMenuStructure(placementsOnly(version, new MenuPlacement("2", "5", 1))),
                "3단계까지만");
        // 5 는 하위가 없고, 기존 4단계 메뉴 6 은 이번 요청과 무관하다.
        menuService.saveMenuStructure(placementsOnly(version, new MenuPlacement("5", "2", 2)));
        assertThat(structureMenus.get(5L).getUpMenuSn()).isEqualTo(2L);
        assertThat(structureMenus.get(5L).getMenuOrdr()).isEqualTo(2);
    }

    @Test
    @DisplayName("[D2] 최종 그래프에 순환이 생기면 거부한다")
    void structureSaveRejectsCycles() {
        String version = givenStructure();
        assertInvalidStructure(() -> menuService.saveMenuStructure(placementsOnly(version, new MenuPlacement("1", "3", 1))),
                "상위 메뉴 계층이 올바르지 않습니다");
        assertInvalidStructure(() -> menuService.saveMenuStructure(placementsOnly(version,
                new MenuPlacement("1", "4", 1), new MenuPlacement("4", "1", 1))), "상위 메뉴 계층이 올바르지 않습니다");
        assertInvalidStructure(() -> menuService.saveMenuStructure(placementsOnly(version, new MenuPlacement("99", null, 1))),
                "존재하지 않는 메뉴입니다: 99");
        assertThat(structureMenus.get(1L).getUpMenuSn()).isNull();
        assertThat(structureMenus.get(4L).getUpMenuSn()).isNull();
    }

    @Test
    @DisplayName("[D2] 삭제할 메뉴에 최종 그래프의 하위가 남으면 이름을 밝혀 거부하고, 하위를 함께 지우거나 옮기면 허용한다")
    void structureSaveRejectsDeletionThatLeavesChildren() {
        String version = givenStructure();
        assertInvalidStructure(() -> menuService.saveMenuStructure(structureSave(version, List.of(), List.of(), List.of(),
                List.of(4L), List.of())), "'Root B' 메뉴에 하위 메뉴 'Child B1'");
        verify(authorizationAdministrationService, never()).removeNavigationGrantsForMenus(anyList());

        menuService.saveMenuStructure(structureSave(version, List.of(), List.of(new MenuPlacement("5", "1", 2)),
                List.of(), List.of(4L), List.of()));
        var order = inOrder(menuRepository, authorizationAdministrationService);
        order.verify(menuRepository).flush();
        order.verify(authorizationAdministrationService).removeNavigationGrantsForMenus(List.of(4L));
        order.verify(menuRepository).deleteAllById(List.of(4L));
        assertThat(structureMenus.get(5L).getUpMenuSn()).isEqualTo(1L);

        menuService.saveMenuStructure(structureSave(version, List.of(), List.of(), List.of(), List.of(5L, 4L), List.of()));
        verify(authorizationAdministrationService).removeNavigationGrantsForMenus(List.of(4L, 5L));
        verify(menuRepository).deleteAllById(List.of(4L, 5L));
    }

    @Test
    @DisplayName("[D2] 옮긴 메뉴가 어떤 그룹에서 숨겨지면 그룹·메뉴·상위 이름을 밝혀 저장 전에 거부한다")
    void structureSaveRejectsMovesThatHideMenusFromAGroup() {
        String version = givenStructure();
        when(authorizationAdministrationService.navigationVisibilityConflicts(any(), any(), any(), any()))
                .thenReturn(List.of(new NavigationConflict(5L, 1L, "G_FIELD", "현장 담당")));
        assertInvalidStructure(() -> menuService.saveMenuStructure(placementsOnly(version, new MenuPlacement("5", "1", 1))),
                "'Child B1'을(를) 옮기면 현장 담당 그룹에서 상위 메뉴 'Root A'가 표시되지 않아 숨겨집니다");
        verify(authorizationAdministrationService).navigationVisibilityConflicts(Map.of(5L, 1L), Map.of(), Map.of(), Map.of());
        assertThat(structureMenus.get(5L).getUpMenuSn()).isEqualTo(4L);
        verify(menuRepository, never()).flush();
    }

    @Test
    @DisplayName("[D2] 속성 저장은 이름·라우트·설명·사용 여부만 바꾸고 상위·순서·연결 프로그램과 미사용 상태를 보존한다")
    void structurePropertiesReplaceOnlyTheirFourFields() {
        String version = givenStructure();
        Menu menu = Menu.builder().menuSn(2L).upMenuSn(1L).menuOrdr(7).menuNm("Child A1").prgrmFileNm("ProgramA")
                .modernRoute("/old").menuExpln("old").useYn("N").build();
        structureMenus.put(2L, menu);

        menuService.saveMenuStructure(structureSave(version, List.of(), List.of(),
                List.of(new MenuProperties(2L, "Renamed", "", null, "N")), List.of(), List.of()));

        assertThat(menu.getMenuNm()).isEqualTo("Renamed");
        assertThat(menu.getModernRoute()).as("라우트가 있던 메뉴를 비우면 빈 문자열 — null 이면 기동 때 라우트 보강이 다시 채운다").isEmpty();
        assertThat(menu.getMenuExpln()).isNull();
        assertThat(menu.getUseYn()).as("미사용 메뉴가 다시 켜지면 안 된다").isEqualTo("N");
        assertThat(menu.getUpMenuSn()).isEqualTo(1L);
        assertThat(menu.getMenuOrdr()).isEqualTo(7);
        assertThat(menu.getPrgrmFileNm()).isEqualTo("ProgramA");
        verifyNoInteractions(authorizationAdministrationService);
    }

    @Test
    @DisplayName("[D2] 이미 비어 있는 라우트(null·빈 문자열)는 빈 값으로 저장해도 그대로 두고, 새 라우트는 그대로 쓴다")
    void structurePropertiesKeepAnAlreadyEmptyRouteAsItIs() {
        String version = givenStructure();
        Menu absent = Menu.builder().menuSn(2L).upMenuSn(1L).menuOrdr(1).menuNm("Child A1").useYn("Y").build();
        Menu cleared = Menu.builder().menuSn(3L).upMenuSn(2L).menuOrdr(1).menuNm("Leaf A1a").modernRoute("").useYn("Y").build();
        Menu routed = Menu.builder().menuSn(5L).upMenuSn(4L).menuOrdr(1).menuNm("Child B1").modernRoute("/old").useYn("Y").build();
        structureMenus.put(2L, absent);
        structureMenus.put(3L, cleared);
        structureMenus.put(5L, routed);

        menuService.saveMenuStructure(structureSave(version, List.of(), List.of(), List.of(
                new MenuProperties(2L, "Child A1", "", null, "Y"), new MenuProperties(3L, "Leaf A1a", null, null, "Y"),
                new MenuProperties(5L, "Child B1", "/admin/new", null, "Y")), List.of(), List.of()));

        assertThat(absent.getModernRoute()).isNull();
        assertThat(cleared.getModernRoute()).isEmpty();
        assertThat(routed.getModernRoute()).isEqualTo("/admin/new");
    }

    @ParameterizedTest
    @ValueSource(strings = {"MENU_UPDATE", "MENU_CREATE", "MENU_DELETE", "AUTHRT_GRANT"})
    @DisplayName("[D2] 구조 저장은 요청이 담은 변경 종류의 권한만 추가로 요구하고 없으면 DB 접근 전에 거부한다")
    void structureSaveRequiresPermissionPerChangeKind(String missing) {
        usePrincipal(CustomUserDetails.builder().userId("tester").esntlId("TESTER_001").groups(List.of("ROLE_ADMIN"))
                .permissions(List.of("MENU_CREATE", "MENU_UPDATE", "MENU_DELETE", "AUTHRT_GRANT").stream()
                        .filter(permission -> !permission.equals(missing)).toList())
                .enabled(true).build());
        var creation = new MenuCreation("new-1", "New", null, null, "Y");
        var full = structureSave("v", List.of(creation), List.of(new MenuPlacement("new-1", null, 9)), List.of(),
                List.of(5L), List.of(new MenuGroupGrantChange("G_A", "gv", List.of("new-1"), List.of(), List.of())));
        assertThatThrownBy(() -> menuService.saveMenuStructure(full)).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        verifyNoInteractions(menuRepository, authorizationAdministrationService);

        if (!"MENU_UPDATE".equals(missing)) {
            // 그 종류의 변경이 없으면 그 권한은 요구하지 않는다.
            String version = givenStructure();
            var without = switch (missing) {
                case "MENU_CREATE" -> structureSave(version, List.of(), List.of(), List.of(), List.of(5L), List.of());
                case "MENU_DELETE" -> placementsOnly(version, new MenuPlacement("5", "4", 3));
                default -> structureSave(version, List.of(creation), List.of(new MenuPlacement("new-1", null, 9)), List.of(),
                        List.of(5L), List.of());
            };
            if ("AUTHRT_GRANT".equals(missing)) stubGeneratedMenuIds(301L);
            menuService.saveMenuStructure(without);
            verify(authorizationAdministrationService, never()).applyMenuStructureGrants(anyList(), anyList());
        }
    }

    @Test
    @DisplayName("[D2] 새 메뉴는 부모 먼저 저장하고 키를 번호로 바꿔 위치·그룹 표시·호환 관리자 배정에 쓴다")
    void structureSaveCreatesParentsFirstAndResolvesKeys() {
        String version = givenStructure();
        stubGeneratedMenuIds(101L);
        var request = structureSave(version,
                List.of(new MenuCreation("new-2", "New child", "/admin/new-child", "설명", "N"),
                        new MenuCreation("new-1", "New root", " ", null, "Y")),
                List.of(new MenuPlacement("new-2", "new-1", 1), new MenuPlacement("new-1", null, 3),
                        new MenuPlacement("5", "new-1", 2)),
                List.of(), List.of(),
                List.of(new MenuGroupGrantChange("G_FIELD", "gv", List.of("new-2", "new-1", "4"), List.of(), List.of("MENU_READ"))));

        menuService.saveMenuStructure(request);

        var saved = ArgumentCaptor.forClass(Menu.class);
        verify(menuRepository, times(2)).save(saved.capture());
        assertThat(saved.getAllValues()).extracting(Menu::getMenuNm).containsExactly("New root", "New child");
        Menu root = saved.getAllValues().get(0);
        Menu child = saved.getAllValues().get(1);
        assertThat(root.getUpMenuSn()).isNull();
        assertThat(root.getMenuOrdr()).isEqualTo(3);
        assertThat(root.getModernRoute()).isNull();
        assertThat(root.getFrstRgtrId()).isEqualTo("webmaster");
        assertThat(child.getUpMenuSn()).isEqualTo(101L);
        assertThat(child.getModernRoute()).isEqualTo("/admin/new-child");
        assertThat(child.getUseYn()).isEqualTo("N");
        assertThat(structureMenus.get(5L).getUpMenuSn()).isEqualTo(101L);
        assertThat(structureMenus.get(5L).getMenuOrdr()).isEqualTo(2);

        var order = inOrder(menuRepository, authorizationAdministrationService);
        order.verify(authorizationAdministrationService).assertGroupVersions(List.of(new GroupVersion("G_FIELD", "gv")));
        // 관리자 그룹을 명시하지 않은 새 메뉴는 호환 배정 후보다 — 숨김 검사는 그 상위(가까운 것부터)를 함께 받는다.
        order.verify(authorizationAdministrationService).navigationVisibilityConflicts(Map.of(5L, -2L),
                Map.of("G_FIELD", java.util.Set.of(-1L, -2L, 4L)), Map.of("G_FIELD", java.util.Set.of()),
                Map.of(-2L, List.of(), -1L, List.of(-2L)));
        order.verify(menuRepository, times(2)).save(any(Menu.class));
        order.verify(menuRepository).flush();
        order.verify(authorizationAdministrationService).applyMenuStructureGrants(List.of(new ResolvedGrantChange("G_FIELD",
                java.util.Set.of(4L, 101L, 102L), java.util.Set.of(), java.util.Set.of("MENU_READ"))), List.of(101L, 102L));
        order.verify(authorizationAdministrationService).grantNewMenuToCompatibilityAdmin(101L);
        order.verify(authorizationAdministrationService).grantNewMenuToCompatibilityAdmin(102L);
        verify(authorizationAdministrationService, never()).removeNavigationGrantsForMenus(anyList());
    }

    @Test
    @DisplayName("[D2] 요청이 관리자 그룹에 새 메뉴 표시를 명시로 주면 그 메뉴의 호환 배정은 다시 하지 않는다")
    void structureSaveSkipsCompatibilityGrantWhenAdminAddsTheMenuExplicitly() {
        String version = givenStructure();
        stubGeneratedMenuIds(201L);
        menuService.saveMenuStructure(structureSave(version,
                List.of(new MenuCreation("new-1", "Root", null, null, "Y"), new MenuCreation("new-2", "Child", null, null, "Y")),
                List.of(new MenuPlacement("new-1", null, 5), new MenuPlacement("new-2", "new-1", 1)),
                List.of(), List.of(),
                List.of(new MenuGroupGrantChange("ROLE_ADMIN", "gv", List.of("new-1"), List.of(), List.of()))));
        verify(authorizationAdministrationService, never()).grantNewMenuToCompatibilityAdmin(201L);
        verify(authorizationAdministrationService).grantNewMenuToCompatibilityAdmin(202L);
        verify(authorizationAdministrationService, never()).navigationVisibilityConflicts(any(), any(), any(), any());
        // 명시한 메뉴는 호환 배정 후보에서 빠진다.
        verify(authorizationAdministrationService).applyMenuStructureGrants(anyList(), org.mockito.ArgumentMatchers.eq(List.of(202L)));
    }

    @Test
    @DisplayName("[D2] 새 폴더를 만들고 기존 메뉴를 그 아래로 옮기면, 숨김 검사는 새 폴더의 호환 관리자 배정 후보를 함께 받는다")
    void structureSavePassesCompatibilityCandidatesToTheVisibilityCheck() {
        String version = givenStructure();
        stubGeneratedMenuIds(401L);
        menuService.saveMenuStructure(structureSave(version, List.of(new MenuCreation("new-1", "Folder", null, null, "Y")),
                List.of(new MenuPlacement("new-1", null, 3), new MenuPlacement("5", "new-1", 1)), List.of(), List.of(), List.of()));
        verify(authorizationAdministrationService).navigationVisibilityConflicts(Map.of(5L, -1L), Map.of(), Map.of(),
                Map.of(-1L, List.of()));
        verify(authorizationAdministrationService).grantNewMenuToCompatibilityAdmin(401L);
        verify(authorizationAdministrationService, never()).applyMenuStructureGrants(anyList(), anyList());
    }

    @Test
    @DisplayName("[D2] 저장은 저장 뒤 DB 에서 다시 읽은 구조와 새 버전을 돌려준다")
    void structureSaveReturnsTheStructureReadBackFromTheDatabase() {
        String version = givenStructure();
        var after = List.<MenuRepository.StructureRow>of(structureRow(1, null, 1, "Root A"), structureRow(5, 1L, 2, "Child B1"));
        when(menuRepository.findStructureRows()).thenReturn(structureRows).thenReturn(after);
        var result = menuService.saveMenuStructure(structureSave(version, List.of(), List.of(),
                List.of(new MenuProperties(1L, "Root A", null, null, "Y")), List.of(), List.of()));
        assertThat(result.version()).isEqualTo(MenuStructurePlan.versionOf(after)).isNotEqualTo(version);
        assertThat(result.menus()).extracting(item -> item.menuNo()).containsExactly(1L, 5L);
    }

    @Test
    @DisplayName("[D2] 형태가 틀린 요청은 DB 를 읽기 전에 사람이 읽을 수 있는 사유로 거부한다")
    void structureSaveRejectsMalformedRequestsBeforeDatabaseAccess() {
        var creation = new MenuCreation("new-1", "New", null, null, "Y");
        var place = new MenuPlacement("new-1", null, 1);
        var grant = new MenuGroupGrantChange("G_A", "gv", List.of("1"), List.of(), List.of());
        Map<String, MenuStructureSave> invalid = new java.util.LinkedHashMap<>();
        invalid.put("바뀐 내용이 없습니다", structureSave("v", List.of(), List.of(), List.of(), List.of(), List.of()));
        invalid.put("두 번 쓰였습니다", structureSave("v", List.of(creation, creation), List.of(place), List.of(), List.of(), List.of()));
        invalid.put("위치를 정해 주세요", structureSave("v", List.of(creation), List.of(), List.of(), List.of(), List.of()));
        invalid.put("위치가 두 번", structureSave("v", List.of(), List.of(new MenuPlacement("5", null, 1), new MenuPlacement("5", "1", 1)),
                List.of(), List.of(), List.of()));
        invalid.put("존재하지 않는 새 메뉴 키", structureSave("v", List.of(), List.of(new MenuPlacement("5", "new-9", 1)),
                List.of(), List.of(), List.of()));
        invalid.put("속성이 두 번", structureSave("v", List.of(), List.of(), List.of(new MenuProperties(1L, "A", null, null, "Y"),
                new MenuProperties(1L, "B", null, null, "Y")), List.of(), List.of()));
        invalid.put("두 번 지정됐습니다", structureSave("v", List.of(), List.of(), List.of(), List.of(3L, 3L), List.of()));
        invalid.put("삭제할 메뉴 5", structureSave("v", List.of(), List.of(new MenuPlacement("5", null, 1)), List.of(), List.of(5L), List.of()));
        invalid.put("삭제할 메뉴 4", structureSave("v", List.of(), List.of(new MenuPlacement("5", "4", 1)), List.of(), List.of(4L), List.of()));
        invalid.put("삭제할 메뉴 2", structureSave("v", List.of(), List.of(), List.of(new MenuProperties(2L, "A", null, null, "Y")),
                List.of(2L), List.of()));
        invalid.put("삭제할 메뉴 1", structureSave("v", List.of(), List.of(), List.of(), List.of(1L), List.of(grant)));
        invalid.put("권한 변경이 두 번", structureSave("v", List.of(), List.of(), List.of(), List.of(), List.of(grant, grant)));
        invalid.put("바꿀 권한이 없습니다", structureSave("v", List.of(), List.of(), List.of(), List.of(),
                List.of(new MenuGroupGrantChange("G_A", "gv", List.of(), List.of(), List.of()))));
        invalid.put("알 수 없는 기능 권한", structureSave("v", List.of(), List.of(), List.of(), List.of(),
                List.of(new MenuGroupGrantChange("G_A", "gv", List.of(), List.of(), List.of("NOT_REGISTERED")))));
        invalid.put("공개 메뉴용 그룹", structureSave("v", List.of(), List.of(), List.of(), List.of(),
                List.of(new MenuGroupGrantChange("ROLE_ANONYMOUS", "gv", List.of(), List.of(), List.of("BOARD_READ")))));
        invalid.put("추가하면서 회수", structureSave("v", List.of(), List.of(), List.of(), List.of(),
                List.of(new MenuGroupGrantChange("G_A", "gv", List.of("2"), List.of(2L), List.of()))));
        invalid.put("메뉴 번호가 너무 큽니다", structureSave("v", List.of(), List.of(new MenuPlacement("9999999999999999999", null, 1)),
                List.of(), List.of(), List.of()));
        invalid.put("요청이 올바르지 않습니다", structureSave("v", null, List.of(), List.of(), List.of(), List.of()));
        invalid.forEach((message, request) -> assertInvalidStructure(() -> menuService.saveMenuStructure(request), message));
        verifyNoInteractions(menuRepository, authorizationAdministrationService);
    }

    @Test
    @DisplayName("[DIP B5 F2] 즐겨찾기가 쓰는 메뉴 배정 판정은 인증 주체의 그룹으로 조회한다")
    void allowedMenuIdsForCurrentUserUsesPrincipalGroups() {
        useGroups("GROUP_STAFF", "GROUP_AUDIT");
        when(navigationGrantRepository.findAllowedMenuIds(List.of("GROUP_AUDIT", "GROUP_STAFF"))).thenReturn(java.util.Set.of(7L));

        assertThat(menuService.allowedMenuIdsForCurrentUser()).containsExactly(7L);
    }
}
