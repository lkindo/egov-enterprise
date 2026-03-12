package com.company.project.service.menu;

import com.company.project.domain.auth.MenuAuthorityRepository;
import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.ProgramRepository;
import com.company.project.domain.auth.MenuCreatManageProjection;
import com.company.project.service.menu.dto.MenuDto;
import egovframework.com.cmm.ComDefaultVO;
import org.springframework.data.domain.Page;
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
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
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

        Menu rootMenu = Menu.builder()
                .id(1L)
                .menuNm("Root Menu")
                .upperMenuNo(0L)
                .menuOrdr(1)
                .build();
        
        Menu childMenu = Menu.builder()
                .id(2L)
                .menuNm("Child Menu")
                .upperMenuNo(1L)
                .menuOrdr(1)
                .build();

        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(List.of(rootMenu, childMenu));
        when(menuAuthorityRepository.findAll()).thenReturn(Collections.emptyList());
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        // When
        List<MenuDto> result = menuService.getMenuHierarchy();

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMenuNm()).isEqualTo("Root Menu");
        assertThat(result.get(0).getChildren()).hasSize(1);
        assertThat(result.get(0).getChildren().get(0).getMenuNm()).isEqualTo("Child Menu");
    }

    @Test
    @DisplayName("메뉴 등록 테스트")
    void insertMenuManageTest() {
        // Given
        MenuDto dto = MenuDto.builder()
                .menuNo(100L)
                .menuNm("New Menu")
                .upperMenuNo(0L)
                .build();

        // When
        menuService.insertMenuManage(dto);

        // Then
        verify(menuRepository).save(any(Menu.class));
    }

    @Test
    @DisplayName("메뉴 상세 조회 테스트")
    void selectMenuManageTest() {
        // Given
        Long menuNo = 1L;
        Menu menu = Menu.builder()
                .id(menuNo)
                .menuNm("Test Menu")
                .build();
        
        when(menuRepository.findById(menuNo)).thenReturn(Optional.of(menu));

        // When
        MenuDto result = menuService.selectMenuManage(menuNo);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getMenuNm()).isEqualTo("Test Menu");
        verify(menuRepository).findById(menuNo);
    }

    @Test
    @DisplayName("메뉴 수정 테스트")
    void updateMenuManageTest() {
        // Given
        Long menuNo = 1L;
        MenuDto dto = MenuDto.builder()
                .menuNo(menuNo)
                .menuNm("Updated Menu")
                .build();
        Menu menu = mock(Menu.class);
        
        when(menuRepository.findById(menuNo)).thenReturn(Optional.of(menu));

        // When
        menuService.updateMenuManage(dto);

        // Then
        verify(menu).updateWithModernRoute(any(), any(), any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("메뉴 삭제 목록 테스트")
    void deleteMenuManageListTest() {
        // Given
        String checkedMenuNoForDel = "1,2,3";

        // When
        menuService.deleteMenuManageList(checkedMenuNoForDel);

        // Then
        verify(menuRepository).deleteAllById(anyList());
    }

    @Test
    @DisplayName("캐싱된 전체 메뉴 조회 테스트")
    void getAllMenusCachedTest() {
        // Given
        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(Collections.emptyList());

        // When
        menuService.getAllMenusCached();

        // Then
        verify(menuRepository).findAllByOrderByUpperMenuNoAscMenuOrdrAsc();
    }

    @Test
    @DisplayName("권한별 메뉴 생성 관리 목록 조회 테스트")
    void selectMenuCreatManagListTest() {
        // Given
        ComDefaultVO searchVO = new ComDefaultVO();
        searchVO.setPageIndex(1);
        searchVO.setRecordCountPerPage(10);
        
        Page<MenuCreatManageProjection> page = mock(Page.class);
        when(menuAuthorityRepository.selectMenuCreatManagList(anyString(), any())).thenReturn(page);
        when(page.stream()).thenReturn(java.util.stream.Stream.empty());

        // When
        menuService.selectMenuCreatManagList(searchVO);

        // Then
        verify(menuAuthorityRepository).selectMenuCreatManagList(anyString(), any());
    }

    @Test
    @DisplayName("메뉴 생성 목록 저장 테스트")
    void insertMenuCreatListTest() {
        // Given
        String authorCode = "ROLE_USER";
        String checkedMenuNos = "1,2";

        // When
        menuService.insertMenuCreatList(authorCode, checkedMenuNos);

        // Then
        verify(menuAuthorityRepository).deleteByIdAuthorCode(authorCode);
        verify(menuAuthorityRepository).saveAll(anyList());
    }

    @Test
    @DisplayName("일반 사용자 메뉴 계층 구조 조회 - 권한 있는 메뉴만 노출")
    void getMenuHierarchy_User_Success() {
        // Given
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("user");
        
        List<GrantedAuthority> authorities = Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"));
        doReturn(authorities).when(authentication).getAuthorities();

        Menu menu1 = Menu.builder().id(1L).menuNm("Authorized").upperMenuNo(0L).menuOrdr(1).build();
        Menu menu2 = Menu.builder().id(2L).menuNm("Unauthorized").upperMenuNo(0L).menuOrdr(2).build();

        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(List.of(menu1, menu2));
        
        // 1번 메뉴만 ROLE_USER 권한이 있는 것으로 설정
        com.company.project.domain.auth.MenuAuthority ma = com.company.project.domain.auth.MenuAuthority.builder()
                .id(com.company.project.domain.auth.MenuAuthority.MenuAuthorityId.builder()
                        .authorCode("ROLE_USER")
                        .menuNo(1L)
                        .build())
                .build();
        when(menuAuthorityRepository.findAll()).thenReturn(List.of(ma));
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        // When
        List<MenuDto> result = menuService.getMenuHierarchy();

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(1L);
    }

    @Test
    @DisplayName("익명 사용자 메뉴 계층 구조 조회 - ROLE_ANONYMOUS 메뉴만 노출")
    void getMenuHierarchy_Anonymous_Success() {
        // Given
        when(securityContext.getAuthentication()).thenReturn(null); // No authentication

        Menu menu = Menu.builder().id(99L).menuNm("Guest Menu").upperMenuNo(0L).menuOrdr(1).build();
        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(List.of(menu));
        
        com.company.project.domain.auth.MenuAuthority ma = com.company.project.domain.auth.MenuAuthority.builder()
                .id(com.company.project.domain.auth.MenuAuthority.MenuAuthorityId.builder()
                        .authorCode("ROLE_ANONYMOUS")
                        .menuNo(99L)
                        .build())
                .build();
        when(menuAuthorityRepository.findAll()).thenReturn(List.of(ma));
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        // When
        List<MenuDto> result = menuService.getMenuHierarchy();

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getId()).isEqualTo(99L);
    }

    @Test
    @DisplayName("상위 메뉴 ID 조회 - 3단계 계층 구조 테스트")
    void getRootMenuIdByProgrmFileNm_MultiLevel_Success() {
        // Given
        String targetProgrm = "childProgrm";
        Menu root = Menu.builder().id(1L).upperMenuNo(0L).build();
        Menu middle = Menu.builder().id(2L).upperMenuNo(1L).build();
        Menu child = Menu.builder().id(3L).upperMenuNo(2L).progrmFileNm(targetProgrm).build();

        when(menuRepository.findByProgrmFileNm(targetProgrm)).thenReturn(Optional.of(child));
        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(List.of(root, middle, child));

        // When
        Long rootId = menuService.getRootMenuIdByProgrmFileNm(targetProgrm);

        // Then
        assertThat(rootId).isEqualTo(1L);
    }

    @Test
    @DisplayName("메뉴 수정 실패 - 존재하지 않는 메뉴")
    void updateMenuManage_NotFound_ThrowsException() {
        // Given
        MenuDto dto = MenuDto.builder().menuNo(999L).build();
        when(menuRepository.findById(999L)).thenReturn(Optional.empty());

        // When & Then
        org.junit.jupiter.api.Assertions.assertThrows(IllegalArgumentException.class, () -> {
            menuService.updateMenuManage(dto);
        });
    }

    @Test
    @DisplayName("메뉴 삭제 목록 - 빈 값 처리")
    void deleteMenuManageList_Empty_NoAction() {
        // When
        menuService.deleteMenuManageList("");
        menuService.deleteMenuManageList(null);

        // Then
        verify(menuRepository, never()).deleteAllById(any());
    }

    @Test
    @DisplayName("메뉴 생성 목록 저장 - 메뉴 번호가 없을 때 삭제만 수행")
    void insertMenuCreatList_NullMenuNos_OnlyDelete() {
        // When
        menuService.insertMenuCreatList("ROLE_TEST", null);

        // Then
        verify(menuAuthorityRepository).deleteByIdAuthorCode("ROLE_TEST");
        verify(menuAuthorityRepository, never()).saveAll(anyList());
    }
}
