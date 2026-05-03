package nuri.foundation.service.menu;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.foundation.domain.auth.MenuAuthority;
import nuri.foundation.domain.auth.MenuAuthorityRepository;
import nuri.foundation.domain.menu.Menu;
import nuri.foundation.domain.menu.MenuRepository;
import nuri.foundation.domain.program.Program;
import nuri.foundation.domain.program.ProgramRepository;
import nuri.foundation.service.menu.dto.MenuDto;
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

        Menu menu1 = Menu.builder().id(1L).menuNm("Menu 1").menuOrdr(1).build();
        Menu menu2 = Menu.builder().id(2L).menuNm("Menu 2").menuOrdr(2).upperMenuNo(1L).build();
        
        List<Object[]> results = new ArrayList<>();
        results.add(new Object[]{menu1, null});
        results.add(new Object[]{menu2, null});
        
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

        Menu menu1 = Menu.builder().id(1L).menuNm("Menu 1").menuOrdr(1).build();
        MenuAuthority auth = MenuAuthority.builder()
                .id(MenuAuthority.MenuAuthorityId.builder().authorCode("ROLE_ANONYMOUS").menuNo(1L).build())
                .build();

        List<Object[]> results = new ArrayList<>();
        results.add(new Object[]{menu1, auth});
        when(menuRepository.findAllWithAuthorities()).thenReturn(results);
        when(programRepository.findAll()).thenReturn(Collections.emptyList());

        // when
        List<MenuDto> hierarchy = menuService.getMenuHierarchy();

        // then
        assertThat(hierarchy).hasSize(1);
    }

    @Test
    @DisplayName("calculateUrl - modernRoute가 있는 경우 우선 적용")
    void calculateUrl_ModernRoute() {
        // given
        Menu menu = Menu.builder().id(1L).modernRoute("/modern").build();
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
        Menu menu = Menu.builder().id(1L).progrmFileNm("dir").build();
        when(menuRepository.findById(1L)).thenReturn(Optional.of(menu));

        // when
        MenuDto result = menuService.selectMenuManage(1L);

        // then
        assertThat(result.getChkURL()).isEqualTo("#");
    }

    @Test
    @DisplayName("calculateUrl - inferModernRoute 매칭 케이스 (BoardManage)")
    void calculateUrl_InferModernRoute() {
        // given
        Menu menu = Menu.builder().id(1L).progrmFileNm("BoardManage").build();
        when(menuRepository.findById(1L)).thenReturn(Optional.of(menu));

        // when
        MenuDto result = menuService.selectMenuManage(1L);

        // then
        assertThat(result.getChkURL()).isEqualTo("/admin/community/boards");
    }

    @Test
    @DisplayName("calculateUrl - legacy URL 추론 (qna)")
    void calculateUrl_InferFromLegacy() {
        // given
        Menu menu = Menu.builder().id(1L).progrmFileNm("SomeProgram").build();
        Program program = Program.builder().progrmFileNm("SomeProgram").url("/uss/olh/qna/list.do").build();
        
        when(menuRepository.findById(1L)).thenReturn(Optional.of(menu));
        when(programRepository.findById("SomeProgram")).thenReturn(Optional.of(program));

        // when
        MenuDto result = menuService.selectMenuManage(1L);

        // then
        assertThat(result.getChkURL()).isEqualTo("/admin/help/qna");
    }

    @Test
    @DisplayName("insertMenuCreatList - 기존 권한 삭제 및 신규 추가")
    void insertMenuCreatList_Success() {
        // when
        menuService.insertMenuCreatList("ROLE_USER", "1,2,3");

        // then
        verify(menuAuthorityRepository).deleteByIdAuthorCode("ROLE_USER");
        verify(menuAuthorityRepository).saveAll(any());
    }

    @Test
    @DisplayName("insertMenuCreatList - 빈 문자열인 경우 추가하지 않음")
    void insertMenuCreatList_Empty() {
        // when
        menuService.insertMenuCreatList("ROLE_USER", "");

        // then
        verify(menuAuthorityRepository).deleteByIdAuthorCode("ROLE_USER");
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
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.ENTITY_NOT_FOUND);
    }

    @Test
    @DisplayName("getRootIdByProgrmFileNm - 최상위 메뉴 ID 찾기")
    void getRootIdByProgrmFileNm() {
        // given
        Menu menu3 = Menu.builder().id(3L).upperMenuNo(2L).progrmFileNm("Prog3").build();
        Menu menu2 = Menu.builder().id(2L).upperMenuNo(1L).build();
        Menu menu1 = Menu.builder().id(1L).upperMenuNo(0L).build();

        when(menuRepository.findByProgrmFileNm("Prog3")).thenReturn(Optional.of(menu3));
        when(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).thenReturn(List.of(menu1, menu2, menu3));

        // when
        Long rootId = menuService.getRootMenuIdByProgrmFileNm("Prog3");

        // then
        assertThat(rootId).isEqualTo(1L);
    }

    @Test
    @DisplayName("inferModernRoute - 모든 분기 테스트")
    void inferModernRoute_AllBranches() {
        // This exercises all if statements in inferModernRoute
        String[] programs = {
            "BoardManage", "BBSMaster", "CmmCode", "GroupList", "RoleList", 
            "AuthorGroup", "QustnrManage", "QustnrTmplat", "AdbkList", "FaqList", 
            "CnsltList", "MainImage", "FileMng", "ProgramList", "MenuCreat", "MenuList", "Unknown"
        };
        
        for (String p : programs) {
            // Internal method call via public method is hard to isolate perfectly, 
            // but selectMenuManage calls calculateUrl which calls inferModernRoute.
            Menu menu = Menu.builder().id(1L).progrmFileNm(p).build();
            when(menuRepository.findById(1L)).thenReturn(Optional.of(menu));
            menuService.selectMenuManage(1L);
        }
    }

    @Test
    @DisplayName("inferFromLegacyUrl - 모든 분기 테스트")
    void inferFromLegacyUrl_AllBranches() {
        String[] urls = {
            "/uss/olh/qna/", "/uss/olh/faq/", "/sec/gmt/", "/sec/ram/", 
            "/sym/ccm/", "/uss/olp/qtm/", "/uss/olp/qmc/", "/unknown/"
        };
        
        for (String url : urls) {
            Menu menu = Menu.builder().id(1L).progrmFileNm("Prog").build();
            Program program = Program.builder().progrmFileNm("Prog").url(url + "test.do").build();
            
            when(menuRepository.findById(1L)).thenReturn(Optional.of(menu));
            when(programRepository.findById("Prog")).thenReturn(Optional.of(program));
            
            menuService.selectMenuManage(1L);
        }
    }
}
