package com.company.project.service.menu;

import com.company.project.domain.auth.MenuAuthority;
import com.company.project.domain.auth.MenuAuthorityRepository;
import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.Program;
import com.company.project.domain.program.ProgramRepository;
import com.company.project.domain.auth.MenuCreatManageProjection;
import com.company.project.service.menu.dto.MenuCreateDto;
import com.company.project.service.menu.dto.MenuDto;
import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import egovframework.com.cmm.ComDefaultVO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MenuServiceTest {

    @Mock
    private MenuRepository menuRepository;

    @Mock
    private ProgramRepository programRepository;

    @Mock
    private MenuAuthorityRepository menuAuthorityRepository;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private MenuService menuService;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setContext(securityContext);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("메뉴 계층 구조 조회 테스트 - 관리자 권한")
    void getMenuHierarchy_Admin_Success() {
        // Given
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("admin");
        
        List<GrantedAuthority> authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_ADMIN"));
        doReturn(authorities).when(authentication).getAuthorities();

        Menu rootMenu = Menu.builder().id(1L).menuNm("Root Menu").upperMenuNo(0L).menuOrdr(1).progrmFileNm("dir").build();
        Menu childMenu = Menu.builder().id(2L).menuNm("Child Menu").upperMenuNo(1L).menuOrdr(1).progrmFileNm("prog1").build();

        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(List.of(rootMenu, childMenu));
        when(menuAuthorityRepository.findAll()).thenReturn(Collections.emptyList());
        
        Program p1 = Program.builder().progrmFileNm("prog1").url("/prog1").build();
        when(programRepository.findAll()).thenReturn(List.of(p1));

        // When
        List<MenuDto> result = menuService.getMenuHierarchy();

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMenuNm()).isEqualTo("Root Menu");
        assertThat(result.get(0).getChildren()).hasSize(1);
        assertThat(result.get(0).getChildren().get(0).getMenuNm()).isEqualTo("Child Menu");
        assertThat(result.get(0).getChildren().get(0).getChkURL()).isEqualTo("/prog1");
    }

    @Test
    @DisplayName("메뉴 등록 테스트")
    void insertMenuManageTest() {
        MenuDto dto = MenuDto.builder().menuNo(100L).menuNm("New Menu").upperMenuNo(0L).build();
        menuService.insertMenuManage(dto);
        verify(menuRepository).save(any(Menu.class));
    }

    @Test
    @DisplayName("메뉴 상세 조회 테스트")
    void selectMenuManage_Success() {
        Long menuNo = 1L;
        Menu menu = Menu.builder().id(menuNo).menuNm("Test Menu").progrmFileNm("prog1").build();
        when(menuRepository.findById(menuNo)).thenReturn(Optional.of(menu));
        
        Program p1 = Program.builder().progrmFileNm("prog1").url("/prog1").build();
        when(programRepository.findById("prog1")).thenReturn(Optional.of(p1));

        MenuDto result = menuService.selectMenuManage(menuNo);

        assertThat(result).isNotNull();
        assertThat(result.getMenuNm()).isEqualTo("Test Menu");
        assertThat(result.getChkURL()).isEqualTo("/prog1");
    }

    @Test
    @DisplayName("메뉴 상세 조회 테스트 - 실패 (메뉴 없음)")
    void selectMenuManage_NotFound() {
        Long menuNo = 1L;
        when(menuRepository.findById(menuNo)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> menuService.selectMenuManage(menuNo))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ENTITY_NOT_FOUND);
    }

    @Test
    @DisplayName("메뉴 수정 테스트 - 성공")
    void updateMenuManage_Success() {
        Long menuNo = 1L;
        MenuDto dto = MenuDto.builder().menuNo(menuNo).menuNm("Updated Menu").build();
        Menu menu = mock(Menu.class);
        when(menuRepository.findById(menuNo)).thenReturn(Optional.of(menu));

        menuService.updateMenuManage(dto);

        verify(menu).updateWithModernRoute(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("메뉴 수정 테스트 - 실패 (메뉴 없음)")
    void updateMenuManage_NotFound() {
        Long menuNo = 1L;
        MenuDto dto = MenuDto.builder().menuNo(menuNo).menuNm("Updated Menu").build();
        when(menuRepository.findById(menuNo)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> menuService.updateMenuManage(dto))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ENTITY_NOT_FOUND);
        verify(menuRepository).findById(menuNo);
    }

    @Test
    @DisplayName("메뉴 삭제 테스트")
    void deleteMenuManageTest() {
        MenuDto dto = MenuDto.builder().menuNo(1L).build();
        menuService.deleteMenuManage(dto);
        verify(menuRepository).deleteById(1L);
    }

    @Test
    @DisplayName("메뉴 삭제 목록 테스트")
    void deleteMenuManageListTest() {
        menuService.deleteMenuManageList("1,2,3");
        verify(menuRepository).deleteAllById(anyList());
    }

    @Test
    @DisplayName("캐싱된 전체 메뉴 조회 테스트")
    void getAllMenusCachedTest() {
        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(Collections.emptyList());
        menuService.getAllMenusCached();
        verify(menuRepository).findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
    }

    @Test
    @DisplayName("권한별 메뉴 생성 관리 목록 조회 테스트")
    void selectMenuCreatManagListTest() {
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(1);
        searchVO.setRecordCountPerPage(10);
        
        MenuCreatManageProjection proj = mock(MenuCreatManageProjection.class);
        when(proj.getAuthorCode()).thenReturn("ROLE_ADMIN");
        when(proj.getChkYeoBu()).thenReturn(1L);
        Page<MenuCreatManageProjection> page = new PageImpl<>(List.of(proj));
        
        when(menuAuthorityRepository.selectMenuCreatManagList(anyString(), any())).thenReturn(page);

        List<MenuCreateDto> res = menuService.selectMenuCreatManagList(searchVO);

        assertThat(res).hasSize(1);
        assertThat(res.get(0).getAuthorCode()).isEqualTo("ROLE_ADMIN");
    }

    @Test
    @DisplayName("권한별 메뉴 생성 관리 총 개수 조회 테스트")
    void selectMenuCreatManagTotCntTest() {
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setSearchKeyword("ROLE");
        
        Page<MenuCreatManageProjection> page = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 1), 5);
        when(menuAuthorityRepository.selectMenuCreatManagList(anyString(), any())).thenReturn(page);

        int count = menuService.selectMenuCreatManagTotCnt(searchVO);

        assertThat(count).isEqualTo(5);
    }

    @Test
    @DisplayName("메뉴 생성 목록 조회 테스트")
    void selectMenuCreatListTest() {
        MenuCreateDto dto = new MenuCreateDto();
        dto.setAuthorCode("ROLE_USER");
        
        com.company.project.domain.auth.MenuAuthorityProjection proj = com.company.project.domain.auth.MenuAuthorityProjection.builder()
                .authorCode("ROLE_USER")
                .menuNo(1L)
                .menuNm("m1")
                .regYn("Y")
                .build();
        
        when(menuAuthorityRepository.selectMenuCreatList("ROLE_USER")).thenReturn(List.of(proj));
        
        List<MenuCreateDto> res = menuService.selectMenuCreatList(dto);
        assertThat(res).hasSize(1);
        assertThat(res.get(0).getMenuNo()).isEqualTo(1);
        assertThat(res.get(0).getChkYeoBu()).isEqualTo(1);
    }

    @Test
    @DisplayName("메뉴 생성 목록 저장 테스트")
    void insertMenuCreatListTest() {
        String authorCode = "ROLE_USER";
        String checkedMenuNos = "1,2,";
        menuService.insertMenuCreatList(authorCode, checkedMenuNos);
        verify(menuAuthorityRepository).deleteByIdAuthorCode(authorCode);
        verify(menuAuthorityRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("일반 사용자 메뉴 계층 구조 조회 - 권한 있는 메뉴만 노출")
    void getMenuHierarchy_User_Success() {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("user");
        List<GrantedAuthority> authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"));
        doReturn(authorities).when(authentication).getAuthorities();

        Menu menu1 = Menu.builder().id(1L).menuNm("Authorized").upperMenuNo(0L).menuOrdr(1).build();
        Menu menu2 = Menu.builder().id(2L).menuNm("Unauthorized").upperMenuNo(0L).menuOrdr(2).build();

        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(List.of(menu1, menu2));
        
        MenuAuthority ma = MenuAuthority.builder()
                .id(MenuAuthority.MenuAuthorityId.builder().authorCode("ROLE_USER").menuNo(1L).build())
                .build();
        when(menuAuthorityRepository.findAll()).thenReturn(List.of(ma));
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        List<MenuDto> result = menuService.getMenuHierarchy();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("익명 사용자 메뉴 계층 구조 조회")
    void getMenuHierarchy_Anonymous_Success() {
        when(securityContext.getAuthentication()).thenReturn(null);

        Menu menu = Menu.builder().id(99L).menuNm("Guest Menu").upperMenuNo(0L).menuOrdr(1).build();
        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(List.of(menu));
        
        MenuAuthority ma = MenuAuthority.builder()
                .id(MenuAuthority.MenuAuthorityId.builder().authorCode("ROLE_ANONYMOUS").menuNo(99L).build())
                .build();
        when(menuAuthorityRepository.findAll()).thenReturn(List.of(ma));
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        List<MenuDto> result = menuService.getMenuHierarchy();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(99L);
    }

    @Test
    @DisplayName("상위 메뉴 ID 조회 - 3단계 계층 구조 테스트")
    void getRootMenuIdByProgrmFileNm_MultiLevel_Success() {
        String targetProgrm = "childProgrm";
        Menu root = Menu.builder().id(1L).upperMenuNo(0L).build();
        Menu middle = Menu.builder().id(2L).upperMenuNo(1L).build();
        Menu child = Menu.builder().id(3L).upperMenuNo(2L).progrmFileNm(targetProgrm).build();

        when(menuRepository.findByProgrmFileNm(targetProgrm)).thenReturn(Optional.of(child));
        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(List.of(root, middle, child));

        Long rootId = menuService.getRootMenuIdByProgrmFileNm(targetProgrm);
        assertThat(rootId).isEqualTo(1L);
    }

    @Test
    @DisplayName("URL로 상위 메뉴 ID 조회 테스트")
    void getRootMenuIdByUrlTest() {
        String url = "/test-url";
        Program prog = Program.builder().progrmFileNm("prog1").build();
        when(programRepository.findByUrl(url)).thenReturn(Optional.of(prog));
        
        Menu root = Menu.builder().id(1L).upperMenuNo(0L).build();
        Menu child = Menu.builder().id(2L).upperMenuNo(1L).progrmFileNm("prog1").build();
        when(menuRepository.findByProgrmFileNm("prog1")).thenReturn(Optional.of(child));
        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(List.of(root, child));
        
        Long rootId = menuService.getRootMenuIdByUrl(url);
        assertThat(rootId).isEqualTo(1L);
    }

    @Test
    @DisplayName("프로그램 전체 조회")
    void getAllProgramsTest() {
        when(programRepository.findAll()).thenReturn(List.of(Program.builder().build()));
        List<Program> list = menuService.getAllPrograms();
        assertThat(list).hasSize(1);
    }

    @Test
    @DisplayName("메뉴 부모 맵 조회")
    void getMenuParentMapCachedTest() {
        Menu root = Menu.builder().id(1L).upperMenuNo(0L).build();
        Menu child = Menu.builder().id(2L).upperMenuNo(1L).build();
        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(List.of(root, child));
        
        Map<Long, Long> map = menuService.getMenuParentMapCached();
        assertThat(map.get(1L)).isEqualTo(0L);
        assertThat(map.get(2L)).isEqualTo(1L);
    }

    @Test
    @DisplayName("모든 메뉴 DTO 조회")
    void getAllMenusTest() {
        Menu menu1 = Menu.builder().id(1L).menuNm("m1").progrmFileNm("prog1").modernRoute("/mod").build();
        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(List.of(menu1));
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        List<MenuDto> list = menuService.getAllMenus();
        assertThat(list).hasSize(1);
        assertThat(list.get(0).getChkURL()).isEqualTo("/mod");
    }

    @Test
    @DisplayName("하위 메뉴 목록 조회")
    void getSubMenusTest() {
        Menu root = Menu.builder().id(1L).upperMenuNo(0L).build();
        Menu child = Menu.builder().id(2L).upperMenuNo(1L).build();
        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(List.of(root, child));
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        List<MenuDto> list = menuService.getSubMenus(1L);
        assertThat(list).hasSize(1);
        assertThat(list.get(0).getId()).isEqualTo(2L);
    }

    @Test
    @DisplayName("메뉴 관리 목록 조회")
    void selectMenuManageListTest() {
        Menu menu1 = Menu.builder().id(1L).progrmFileNm("prog1").build();
        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(List.of(menu1));
        
        Program p1 = Program.builder().progrmFileNm("prog1").url("/prog1").build();
        when(programRepository.findAll()).thenReturn(List.of(p1));

        List<MenuDto> list = menuService.selectMenuManageList(new ComDefaultVO());
        assertThat(list).hasSize(1);
        assertThat(list.get(0).getChkURL()).isEqualTo("/prog1");
    }

    @Test
    @DisplayName("메뉴 관리 목록 개수 조회")
    void selectMenuManageListTotCntTest() {
        when(menuRepository.count()).thenReturn(10L);
        int cnt = menuService.selectMenuManageListTotCnt(new ComDefaultVO());
        assertThat(cnt).isEqualTo(10);
    }

    @Test
    @DisplayName("URL로 프로그램명 조회 - 빈 URL")
    void getProgrmFileNmByUrl_Empty() {
        assertThat(menuService.getProgrmFileNmByUrl(null)).isNull();
        assertThat(menuService.getProgrmFileNmByUrl("")).isNull();
    }

    @Test
    @DisplayName("URL로 상위 메뉴 ID 조회 - 프로그램명 없음")
    void getRootMenuIdByUrl_NoProgrm() {
        when(programRepository.findByUrl(anyString())).thenReturn(Optional.empty());
        assertThat(menuService.getRootMenuIdByUrl("/not-exist")).isNull();
    }
}
