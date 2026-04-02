package com.company.project.foundation.service.menu;

import com.company.project.foundation.domain.auth.MenuAuthorityRepository;
import com.company.project.foundation.domain.menu.Menu;
import com.company.project.foundation.domain.menu.MenuRepository;
import com.company.project.foundation.domain.program.ProgramRepository;
import com.company.project.foundation.service.menu.dto.MenuDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@DisplayName("MenuService 테스트")
class MenuServiceTest {

    @Mock
    private MenuRepository menuRepository;

    @Mock
    private ProgramRepository programRepository;

    @Mock
    private MenuAuthorityRepository menuAuthorityRepository;

    @InjectMocks
    private MenuService menuService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        
        // SecurityContext Mocking
        SecurityContext securityContext = mock(SecurityContext.class);
        Authentication authentication = mock(Authentication.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn("user");
        when(authentication.getAuthorities()).thenAnswer(i -> Collections.emptyList());
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    @DisplayName("메뉴 계층 구조 조회 테스트")
    void testGetMenuHierarchy() {
        // Given
        when(menuRepository.findAllWithAuthorities()).thenReturn(Collections.emptyList());
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        // When
        List<MenuDto> result = menuService.getMenuHierarchy();

        // Then
        assertNotNull(result);
        verify(menuRepository, times(1)).findAllWithAuthorities();
    }

    @Test
    @DisplayName("메뉴 상세 조회 테스트")
    void testSelectMenuManage() {
        // Given
        Menu menu = new Menu(1L, "테스트메뉴", null, null, 1, "설명", null, null, "/test", "admin", null, "admin", null);
        when(menuRepository.findById(1L)).thenReturn(Optional.of(menu));

        // When
        MenuDto result = menuService.selectMenuManage(1L);

        // Then
        assertNotNull(result);
        assertEquals("테스트메뉴", result.getMenuNm());
        assertEquals("/test", result.getChkURL());
    }

    @Test
    @DisplayName("메뉴 등록 테스트")
    void testInsertMenuManage() {
        // Given
        MenuDto dto = MenuDto.builder()
                .menuNo(100L)
                .menuNm("신규메뉴")
                .progrmFileNm("PROG_01")
                .modernRoute("/new")
                .build();
        when(programRepository.existsById("PROG_01")).thenReturn(true);

        // When
        menuService.insertMenuManage(dto);

        // Then
        verify(menuRepository, times(1)).save(any(Menu.class));
    }
}