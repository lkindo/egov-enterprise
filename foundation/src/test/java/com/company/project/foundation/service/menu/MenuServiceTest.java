package com.company.project.foundation.service.menu;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import com.company.project.foundation.domain.auth.MenuAuthority;
import com.company.project.foundation.domain.auth.MenuAuthority.MenuAuthorityId;
import com.company.project.foundation.domain.auth.MenuAuthorityRepository;
import com.company.project.foundation.domain.auth.MenuCreatManageProjection;
import com.company.project.foundation.domain.menu.Menu;
import com.company.project.foundation.domain.menu.MenuRepository;
import com.company.project.foundation.domain.program.Program;
import com.company.project.foundation.domain.program.ProgramRepository;
import com.company.project.foundation.service.menu.dto.MenuCreateDto;
import com.company.project.foundation.service.menu.dto.MenuDto;
import com.company.project.foundation.core.exception.BusinessException;
import egovframework.com.cmm.ComDefaultVO;

@ExtendWith(MockitoExtension.class)
public class MenuServiceTest {

    @Mock private MenuRepository menuRepository;
    @Mock private ProgramRepository programRepository;
    @Mock private MenuAuthorityRepository menuAuthorityRepository;

    @InjectMocks private MenuService menuService;

    @Mock private Authentication authentication;
    @Mock private SecurityContext securityContext;

    @BeforeEach
    public void setup() {
        SecurityContextHolder.setContext(securityContext);
    }

    private void mockAuth(String principal, String role) {
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(principal);
        doReturn(Arrays.asList(new SimpleGrantedAuthority(role))).when(authentication).getAuthorities();
    }

    @Test
    public void testGetMenuHierarchy_Anonymous() {
        // Given
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(false); // Not authenticated
        
        Menu root = Menu.builder().id(1L).menuNm("Public").upperMenuNo(0L).build();
        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(Arrays.asList(root));
        
        MenuAuthorityId maId = MenuAuthorityId.builder().menuNo(1L).authorCode("ROLE_ANONYMOUS").build();
        when(menuAuthorityRepository.findAll()).thenReturn(Arrays.asList(MenuAuthority.builder().id(maId).build()));

        // When
        List<MenuDto> result = menuService.getMenuHierarchy();

        // Then
        assertEquals(1, result.size());
        assertEquals("Public", result.get(0).getMenuNm());
    }

    @Test
    public void testGetMenuHierarchy_Admin_WithInference() {
        // Given
        mockAuth("admin", "ROLE_ADMIN");

        Menu m1 = Menu.builder().id(1L).menuNm("System").progrmFileNm("CmmCodeManage").upperMenuNo(0L).build();
        Menu m2 = Menu.builder().id(2L).menuNm("Board").progrmFileNm("BoardManage").upperMenuNo(0L).build();
        
        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(Arrays.asList(m1, m2));
        when(menuAuthorityRepository.findAll()).thenReturn(Collections.emptyList());

        // When
        List<MenuDto> result = menuService.getMenuHierarchy();

        // Then
        assertEquals(2, result.size());
        assertEquals("/admin/system/common-code", result.get(0).getChkURL());
        assertEquals("/admin/community/boards", result.get(1).getChkURL());
    }

    @Test
    public void testGetSubMenus() {
        // Given
        mockAuth("user", "ROLE_USER");
        Menu child = Menu.builder().id(2L).menuNm("Child").upperMenuNo(1L).build();
        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(Arrays.asList(child));
        
        MenuAuthorityId maId = MenuAuthorityId.builder().menuNo(2L).authorCode("ROLE_USER").build();
        when(menuAuthorityRepository.findAll()).thenReturn(Arrays.asList(MenuAuthority.builder().id(maId).build()));

        // When
        List<MenuDto> result = menuService.getSubMenus(1L);

        // Then
        assertEquals(1, result.size());
        assertEquals("Child", result.get(0).getMenuNm());
    }

    @Test
    public void testGetAllMenusCachedAndParentMap() {
        Menu m = Menu.builder().id(10L).upperMenuNo(5L).build();
        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(Arrays.asList(m));

        assertEquals(1, menuService.getAllMenusCached().size());
        Map<Long, Long> parentMap = menuService.getMenuParentMapCached();
        assertEquals(5L, parentMap.get(10L));
    }

    @Test
    public void testSelectMenuCreatManagList() {
        // Given
        ComDefaultVO vo = new ComDefaultVO();
        vo.setPageIndex(1);
        vo.setRecordCountPerPage(10);
        vo.setSearchKeyword("AUTH");

        MenuCreatManageProjection proj = mock(MenuCreatManageProjection.class);
        when(proj.getAuthorCode()).thenReturn("ROLE_TEST");
        when(proj.getChkYeoBu()).thenReturn(1L);
        
        Page<MenuCreatManageProjection> page = new PageImpl<>(Arrays.asList(proj));
        when(menuAuthorityRepository.selectMenuCreatManagList(anyString(), any(Pageable.class))).thenReturn(page);

        // When
        List<MenuCreateDto> result = menuService.selectMenuCreatManagList(vo);

        // Then
        assertEquals(1, result.size());
        assertEquals("ROLE_TEST", result.get(0).getAuthorCode());
        assertEquals(1, menuService.selectMenuCreatManagTotCnt(vo));
    }

    @Test
    public void testInsertMenuCreatList() {
        // When
        menuService.insertMenuCreatList("ROLE_NEW", "1,2,3");

        // Then
        verify(menuAuthorityRepository).deleteByIdAuthorCode("ROLE_NEW");
        verify(menuAuthorityRepository).saveAll(anyList());
    }

    @Test
    public void testInsertMenuManage_AutoProgram() {
        // Given
        MenuDto dto = MenuDto.builder()
                .menuNo(100L).menuNm("NewMenu").progrmFileNm("AutoProg").modernRoute("/auto").build();
        when(programRepository.existsById("AutoProg")).thenReturn(false);

        // When
        menuService.insertMenuManage(dto);

        // Then
        verify(programRepository).save(any(Program.class));
        verify(menuRepository).save(any(Menu.class));
    }

    @Test
    public void testUpdateMenuManage_NotFound() {
        MenuDto dto = MenuDto.builder().menuNo(999L).build();
        when(menuRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(BusinessException.class, () -> menuService.updateMenuManage(dto));
    }

    @Test
    public void testDeleteMenuManage() {
        MenuDto dto = MenuDto.builder().menuNo(1L).build();
        menuService.deleteMenuManage(dto);
        verify(menuRepository).deleteById(1L);

        menuService.deleteMenuManageList("1,2,");
        verify(menuRepository).deleteAllById(anyList());
    }

    @Test
    public void testGetRootMenuIdByUrl() {
        // Given
        Program p = Program.builder().progrmFileNm("TargetProg").build();
        when(programRepository.findByUrl("/target")).thenReturn(Optional.of(p));
        
        Menu m1 = Menu.builder().id(10L).menuNm("Root").upperMenuNo(0L).build();
        Menu m2 = Menu.builder().id(20L).menuNm("Child").upperMenuNo(10L).progrmFileNm("TargetProg").build();
        
        when(menuRepository.findByProgrmFileNm("TargetProg")).thenReturn(Optional.of(m2));
        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(Arrays.asList(m1, m2));

        // When
        Long rootId = menuService.getRootMenuIdByUrl("/target");

        // Then
        assertEquals(10L, rootId);
    }

    @Test
    public void testCalculateUrl_LegacyFallback() {
        // Given
        Menu m = Menu.builder().id(1L).progrmFileNm("LegacyProg").build();
        Program p = Program.builder().progrmFileNm("LegacyProg").url("/uss/olh/qna/list.do").build();
        when(programRepository.findById("LegacyProg")).thenReturn(Optional.of(p));
        when(menuRepository.findById(1L)).thenReturn(Optional.of(m));

        // When
        MenuDto result = menuService.selectMenuManage(1L);

        // Then
        assertEquals("/admin/help/qna", result.getChkURL());
    }

    @Test
    public void testInference_DiversePatterns() {
        String[][] cases = {
            {"BBSMaster", "/admin/community"},
            {"RoleList", "/admin/security/role"},
            {"AdbkList", "/admin/collaboration/address-book"},
            {"MainImage", "/admin/system/banner"},
            {"ProgramList", "/admin/system/programs"}
        };

        for (String[] c : cases) {
            Menu m = Menu.builder().id(100L).progrmFileNm(c[0]).build();
            // Using reflection or internal method testing if possible, but here via selectMenuManage
            when(menuRepository.findById(100L)).thenReturn(Optional.of(m));
            assertEquals(c[1], menuService.selectMenuManage(100L).getChkURL());
        }
    }
}
