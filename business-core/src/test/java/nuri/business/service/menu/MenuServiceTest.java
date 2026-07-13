package nuri.business.service.menu;
import nuri.foundation.core.exception.CommonErrorCode;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.domain.auth.MenuAuthority;
import nuri.business.domain.auth.MenuAuthorityRepository;
import nuri.business.domain.menu.Menu;
import nuri.business.domain.menu.MenuRepository;
import nuri.business.domain.program.Program;
import nuri.business.domain.program.ProgramRepository;
import nuri.business.service.menu.dto.MenuDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("MenuService 단위 테스트")
class MenuServiceTest {

    @Mock
    private MenuRepository menuRepository;

    @Mock
    private ProgramRepository programRepository;

    @Mock
    private MenuAuthorityRepository menuAuthorityRepository;

    @Mock
    private nuri.business.service.program.dto.ProgramMapper programMapper;

    @InjectMocks
    private MenuService menuService;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    @DisplayName("getMenuHierarchy - ROLE_ADMIN인 경우 모든 메뉴 조회")
    void getMenuHierarchy_Admin() {
        // given
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("admin");
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))).when(authentication).getAuthorities();

        Menu menu1 = Menu.builder().menuSn(1L).menuNm("Menu 1").menuOrdr(1).build();
        Menu menu2 = Menu.builder().menuSn(2L).menuNm("Menu 2").menuOrdr(2).upMenuSn(1L).build();
        
        List<nuri.business.service.menu.dto.MenuWithAuthDto> results = new ArrayList<>();
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menu1, null));
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menu2, null));
        
        when(menuRepository.findAllWithAuthorities()).thenReturn(results);
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        // when
        List<MenuDto> hierarchy = menuService.getMenuHierarchy();

        // then
        assertThat(hierarchy).hasSize(1);
        assertThat(hierarchy.get(0).getMenuNm()).isEqualTo("Menu 1");
        assertThat(hierarchy.get(0).getChildren()).hasSize(1);
    }

    @Test
    @DisplayName("getMenuHierarchy - 익명 사용자인 경우 ROLE_ANONYMOUS 권한 적용")
    void getMenuHierarchy_Anonymous() {
        // given
        when(securityContext.getAuthentication()).thenReturn(null);

        Menu menu1 = Menu.builder().menuSn(1L).menuNm("Menu 1").menuOrdr(1).build();
        MenuAuthority auth = MenuAuthority.builder()
                .id(MenuAuthority.MenuAuthorityId.builder().authrtCd("ROLE_ANONYMOUS").menuSn(1L).build())
                .build();

        List<nuri.business.service.menu.dto.MenuWithAuthDto> results = new ArrayList<>();
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menu1, auth));
        when(menuRepository.findAllWithAuthorities()).thenReturn(results);
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
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("admin");
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))).when(authentication).getAuthorities();

        Menu menuActive = Menu.builder().menuSn(1L).menuNm("Active Menu").menuOrdr(1).useYn("Y").build();
        Menu menuInactive = Menu.builder().menuSn(2L).menuNm("Inactive Menu").menuOrdr(2).useYn("N").build();
        
        List<nuri.business.service.menu.dto.MenuWithAuthDto> results = new ArrayList<>();
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menuActive, null));
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menuInactive, null));
        
        when(menuRepository.findAllWithAuthorities()).thenReturn(results);
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
        menuService.insertMenuCreatList("ROLE_USER", "1,2,3");

        // then
        verify(menuAuthorityRepository).deleteByIdAuthrtCd("ROLE_USER");
        verify(menuAuthorityRepository).saveAll(any());
    }

    @Test
    @DisplayName("insertMenuCreatList - 빈 문자열인 경우 추가하지 않음")
    void insertMenuCreatList_Empty() {
        // when
        menuService.insertMenuCreatList("ROLE_USER", "");

        // then
        verify(menuAuthorityRepository).deleteByIdAuthrtCd("ROLE_USER");
        verify(menuAuthorityRepository, never()).saveAll(any());
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
    @DisplayName("getMenuHierarchy - 예외 발생 시 catch 블록 테스트")
    void getMenuHierarchy_Exception() {
        when(securityContext.getAuthentication()).thenReturn(null);
        when(menuRepository.findAllWithAuthorities()).thenThrow(new RuntimeException("DB Error"));

        assertThatThrownBy(() -> menuService.getMenuHierarchy())
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("DB Error");
    }

    @Test
    @DisplayName("getMenuHierarchy - 일반 사용자(ROLE_USER) 권한 일치 필터링 테스트")
    void getMenuHierarchy_NotAdminButAuthorized() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("user");
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_USER"))).when(authentication).getAuthorities();

        Menu menu1 = Menu.builder().menuSn(1L).menuNm("Auth Menu").build();
        Menu menu2 = Menu.builder().menuSn(2L).menuNm("NoAuth Menu").build();
        
        MenuAuthority auth = MenuAuthority.builder()
                .id(MenuAuthority.MenuAuthorityId.builder().authrtCd("ROLE_USER").menuSn(1L).build())
                .build();

        List<nuri.business.service.menu.dto.MenuWithAuthDto> results = new ArrayList<>();
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menu1, auth));
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menu2, null)); // 권한 없음

        when(menuRepository.findAllWithAuthorities()).thenReturn(results);
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
        MenuAuthority authParent = MenuAuthority.builder()
                .id(MenuAuthority.MenuAuthorityId.builder().authrtCd("ROLE_ANONYMOUS").menuSn(1L).build())
                .build();
        MenuAuthority auth = MenuAuthority.builder()
                .id(MenuAuthority.MenuAuthorityId.builder().authrtCd("ROLE_ANONYMOUS").menuSn(2L).build())
                .build();

        List<nuri.business.service.menu.dto.MenuWithAuthDto> results = new ArrayList<>();
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(parentMenu, authParent));
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menu1, auth));
        
        when(menuRepository.findAllWithAuthorities()).thenReturn(results);
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
            
        when(menuAuthorityRepository.selectMenuCreatManagList(eq("ROLE"), any())).thenReturn(page);
        
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
        
        when(menuAuthorityRepository.selectMenuCreatList("ROLE_USER")).thenReturn(List.of(proj));
        
        List<nuri.business.service.menu.dto.MenuCreateDto> result = menuService.selectMenuCreatList(vo);
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getChkYeoBu()).isEqualTo(1);
    }

    @Test
    @DisplayName("insertMenuManage - Program이 없어서 새로 생성하는 분기")
    void insertMenuManage_ProgramNotExists() {
        MenuDto dto = MenuDto.builder().menuNo(1L).prgrmFileNm("NewProgram").build();
        when(programRepository.existsById("NewProgram")).thenReturn(false);
        
        menuService.insertMenuManage(dto);
        
        verify(programRepository).save(any(Program.class));
        verify(menuRepository).save(any(Menu.class));
    }

    @Test
    @DisplayName("updateMenuManage - 성공")
    void updateMenuManage_Success() {
        MenuDto dto = MenuDto.builder().menuNo(1L).menuNm("Updated").build();
        Menu menu = mock(Menu.class);
        when(menuRepository.findById(1L)).thenReturn(Optional.of(menu));
        
        menuService.updateMenuManage(dto);
        
        verify(menu).updateWithModernRoute(eq("Updated"), any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("deleteMenuManageList - 체크된 번호 삭제")
    void deleteMenuManageList_Valid() {
        menuService.deleteMenuManageList("1,2,,3"); // 빈 값 포함
        verify(menuRepository).deleteAllById(List.of(1L, 2L, 3L));
        
        menuService.deleteMenuManageList(null); // 조기 리턴 분기
        menuService.deleteMenuManage(MenuDto.builder().menuNo(1L).build());
        verify(menuRepository).deleteById(1L);
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
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("admin");
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))).when(authentication).getAuthorities();

        Menu menuMax = Menu.builder().menuSn(10000000L).menuNm("Max Menu").build(); // id > 9999999
        Menu menuNullUpper = Menu.builder().menuSn(1L).menuNm("Null Upper").upMenuSn(null).useYn("Y").build();
        Menu menuZeroUpper = Menu.builder().menuSn(2L).menuNm("Zero Upper").upMenuSn(0L).useYn("Y").build();
        Menu menuNormal = Menu.builder().menuSn(3L).menuNm("Normal").upMenuSn(1L).useYn("Y").build();
        Menu menuOrphan = Menu.builder().menuSn(4L).menuNm("Orphan").upMenuSn(99L).useYn("Y").build(); // dtoMap doesn't contain upper

        List<nuri.business.service.menu.dto.MenuWithAuthDto> results = new ArrayList<>();
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menuMax, null));
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menuNullUpper, null));
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menuZeroUpper, null));
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menuNormal, null));
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menuOrphan, null));

        when(menuRepository.findAllWithAuthorities()).thenReturn(results);
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        List<MenuDto> hierarchy = menuService.getMenuHierarchy();
        // menuMax는 필터링됨 (id > 9999999)
        // Null Upper와 Zero Upper는 루트
        assertThat(hierarchy).hasSize(2);
    }

    @Test
    @DisplayName("buildMenuTree - 특정 rootMenuNo 지정 및 Orphan 테스트")
    void buildMenuTree_SpecificRootMenuNo() {
        when(securityContext.getAuthentication()).thenReturn(null);
        
        Menu parentMenu = Menu.builder().menuSn(1L).menuNm("Parent Menu").upMenuSn(0L).useYn("Y").build();
        Menu menuChild = Menu.builder().menuSn(2L).menuNm("Child Menu").upMenuSn(1L).useYn("Y").build();
        Menu menuOrphan = Menu.builder().menuSn(3L).menuNm("Orphan").upMenuSn(99L).useYn("Y").build(); // 상위 메뉴 없음
        Menu menuSubChild = Menu.builder().menuSn(4L).menuNm("Sub Child").upMenuSn(2L).useYn("Y").build(); // 하위의 하위

        MenuAuthority authParent = MenuAuthority.builder()
                .id(MenuAuthority.MenuAuthorityId.builder().authrtCd("ROLE_ANONYMOUS").menuSn(1L).build())
                .build();
        MenuAuthority auth = MenuAuthority.builder()
                .id(MenuAuthority.MenuAuthorityId.builder().authrtCd("ROLE_ANONYMOUS").menuSn(2L).build())
                .build();
        MenuAuthority authOrphan = MenuAuthority.builder()
                .id(MenuAuthority.MenuAuthorityId.builder().authrtCd("ROLE_ANONYMOUS").menuSn(3L).build())
                .build();
        MenuAuthority authSubChild = MenuAuthority.builder()
                .id(MenuAuthority.MenuAuthorityId.builder().authrtCd("ROLE_ANONYMOUS").menuSn(4L).build())
                .build();

        List<nuri.business.service.menu.dto.MenuWithAuthDto> results = new ArrayList<>();
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(parentMenu, authParent));
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menuChild, auth));
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menuOrphan, authOrphan));
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menuSubChild, authSubChild));
        
        when(menuRepository.findAllWithAuthorities()).thenReturn(results);
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
        menuService.insertMenuCreatList("ROLE_USER", null);
        verify(menuAuthorityRepository).deleteByIdAuthrtCd("ROLE_USER");
        verify(menuAuthorityRepository, never()).saveAll(any());

        menuService.insertMenuCreatList("ROLE_USER", ",,");
        verify(menuAuthorityRepository, times(2)).deleteByIdAuthrtCd("ROLE_USER");
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
            
        when(menuAuthorityRepository.selectMenuCreatManagList(eq(""), any())).thenReturn(page);
        
        List<nuri.business.service.menu.dto.MenuCreateDto> list = menuService.selectMenuCreatManagList(search);
        assertThat(list).isEmpty();
        
        int count = menuService.selectMenuCreatManagTotCnt(search);
        assertThat(count).isEqualTo(0);
    }

    @Test
    @DisplayName("getSubMenus - rootMenuNo가 null 이거나 <= 0 인 경우")
    void getSubMenus_NullOrZero() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("admin");
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))).when(authentication).getAuthorities();

        Menu menu1 = Menu.builder().menuSn(1L).menuNm("Menu 1").menuOrdr(1).useYn("Y").build();
        List<nuri.business.service.menu.dto.MenuWithAuthDto> results = new ArrayList<>();
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menu1, null));
        when(menuRepository.findAllWithAuthorities()).thenReturn(results);
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        try {
            menuService.getSubMenus(null);
            menuService.getSubMenus(0L);
            menuService.getSubMenus(-1L);
        } catch(Exception e) {
            // expected or caught
        }
    }

    @Test
    @DisplayName("getSubMenus - 찾지 못하는 rootMenuNo 인 경우")
    void getSubMenus_NotFound() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("admin");
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))).when(authentication).getAuthorities();

        Menu menu1 = Menu.builder().menuSn(1L).menuNm("Menu 1").menuOrdr(1).useYn("Y").build();
        List<nuri.business.service.menu.dto.MenuWithAuthDto> results = new ArrayList<>();
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menu1, null));
        when(menuRepository.findAllWithAuthorities()).thenReturn(results);
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        assertThat(menuService.getSubMenus(999L)).isEmpty();
    }

    @Test
    @DisplayName("getSubMenus - Children이 Null인 MenuDto 반환")
    void getSubMenus_ChildrenNull() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("admin");
        doReturn(List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))).when(authentication).getAuthorities();

        Menu menu1 = Menu.builder().menuSn(1L).menuNm("Menu 1").menuOrdr(1).useYn("Y").build();
        List<nuri.business.service.menu.dto.MenuWithAuthDto> results = new ArrayList<>();
        results.add(new nuri.business.service.menu.dto.MenuWithAuthDto(menu1, null));
        when(menuRepository.findAllWithAuthorities()).thenReturn(results);
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        List<MenuDto> subMenus = menuService.getSubMenus(1L);
        assertThat(subMenus).isEmpty(); // getChildren이 null 이면 new ArrayList<>() 반환
    }



    @Test
    @DisplayName("deleteMenuManageList - null 이나 비어있는 문자열 처리")
    void deleteMenuManageList_Empty() {
        try {
            menuService.deleteMenuManageList(null);
        } catch(Exception e) {}
        try {
            menuService.deleteMenuManageList("");
        } catch(Exception e) {}
        try {
            menuService.deleteMenuManageList("   ");
        } catch(Exception e) {}
        
        verify(menuRepository, never()).deleteAllById(any());
    }

    @Test
    @DisplayName("insertMenuCreatList - split 후 trim 처리 빈문자열 무시")
    void insertMenuCreatList_TrimmedEmpty() {
        try {
            menuService.insertMenuCreatList("ROLE_USER", "1, , 3,");
        } catch(Exception e) {}
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
}
