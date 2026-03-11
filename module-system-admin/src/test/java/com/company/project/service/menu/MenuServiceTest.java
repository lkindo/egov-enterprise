package com.company.project.service.menu;

import com.company.project.domain.auth.MenuAuthorityRepository;
import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.ProgramRepository;
import com.company.project.service.menu.dto.MenuDto;
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
    @DisplayName("메뉴 삭제 테스트")
    void deleteMenuManageTest() {
        // Given
        MenuDto dto = MenuDto.builder().menuNo(1L).build();

        // When
        menuService.deleteMenuManage(dto);

        // Then
        verify(menuRepository).deleteById(1L);
    }
}
