package nuri.foundation.service.menu;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.auth.MenuAuthorityRepository;
import nuri.foundation.domain.menu.Menu;
import nuri.foundation.domain.menu.MenuRepository;
import nuri.foundation.domain.program.Program;
import nuri.foundation.domain.program.ProgramRepository;
import nuri.foundation.service.menu.dto.MenuCreateDto;
import nuri.foundation.service.menu.dto.MenuDto;
import egovframework.com.cmm.ComDefaultVO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("MenuService 단위 테스트")
class MenuServiceTest {

    @InjectMocks
    private MenuService menuService;

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

    @BeforeEach
    void setUp() {
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    @DisplayName("메뉴 계층 구조 조회 - 관리자 권한")
    void getMenuHierarchy_Admin() {
        // given
        given(securityContext.getAuthentication()).willReturn(authentication);
        given(authentication.isAuthenticated()).willReturn(true);
        Collection<? extends GrantedAuthority> authorities = List.of(new SimpleGrantedAuthority("ROLE_ADMIN"));
        doReturn(authorities).when(authentication).getAuthorities();
        given(authentication.getPrincipal()).willReturn("admin");

        Menu menu = Menu.builder().id(1L).menuNm("Root").menuOrdr(1).build();
        Object[] result = new Object[]{menu, null};
        given(menuRepository.findAllWithAuthorities()).willReturn(Collections.singletonList(result));
        given(programRepository.findAll()).willReturn(new ArrayList<>());

        // when
        List<MenuDto> hierarchy = menuService.getMenuHierarchy();

        // then
        assertThat(hierarchy).hasSize(1);
        assertThat(hierarchy.get(0).getMenuNm()).isEqualTo("Root");
    }

    @Test
    @DisplayName("모든 메뉴 조회")
    void getAllMenus() {
        Menu menu = Menu.builder().id(1L).menuNm("Menu 1").build();
        Program program = Program.builder().progrmFileNm("Prog1").url("/prog1").build();
        Object[] result = new Object[]{menu, program};
        given(menuRepository.findAllWithPrograms()).willReturn(Collections.singletonList(result));

        List<MenuDto> dtos = menuService.getAllMenus();

        assertThat(dtos).hasSize(1);
        assertThat(dtos.get(0).getMenuNm()).isEqualTo("Menu 1");
    }

    @Test
    @DisplayName("메뉴 생성")
    void insertMenuManage() {
        MenuDto dto = MenuDto.builder()
                .menuNo(100L)
                .menuNm("New Menu")
                .progrmFileNm("NewProg")
                .build();
        
        given(programRepository.existsById("NewProg")).willReturn(false);

        menuService.insertMenuManage(dto);

        verify(menuRepository, times(1)).save(any(Menu.class));
        verify(programRepository, times(1)).save(any(Program.class));
    }

    @Test
    @DisplayName("메뉴 수정 - 성공")
    void updateMenuManage_Success() {
        Menu menu = Menu.builder().id(1L).menuNm("Old").build();
        given(menuRepository.findById(1L)).willReturn(Optional.of(menu));

        MenuDto dto = MenuDto.builder().menuNo(1L).menuNm("New").build();
        menuService.updateMenuManage(dto);

        assertThat(menu.getMenuNm()).isEqualTo("New");
    }

    @Test
    @DisplayName("메뉴 수정 - 실패")
    void updateMenuManage_Fail() {
        given(menuRepository.findById(99L)).willReturn(Optional.empty());
        MenuDto dto = MenuDto.builder().menuNo(99L).build();

        assertThrows(BusinessException.class, () -> menuService.updateMenuManage(dto));
    }

    @Test
    @DisplayName("메뉴 삭제")
    void deleteMenuManage() {
        MenuDto dto = MenuDto.builder().menuNo(1L).build();
        menuService.deleteMenuManage(dto);
        verify(menuRepository, times(1)).deleteById(1L);
    }

    @Test
    @DisplayName("메뉴 목록 삭제")
    void deleteMenuManageList() {
        menuService.deleteMenuManageList("1,2,3");
        verify(menuRepository, times(1)).deleteAllById(anyList());
    }

    @Test
    @DisplayName("URL로 루트 메뉴 ID 조회")
    void getRootMenuIdByUrl() {
        Program program = Program.builder().progrmFileNm("Prog1").url("/url1").build();
        given(programRepository.findByUrl("/url1")).willReturn(Optional.of(program));
        
        Menu menu = Menu.builder().id(10L).progrmFileNm("Prog1").upperMenuNo(0L).build();
        given(menuRepository.findByProgrmFileNm("Prog1")).willReturn(Optional.of(menu));
        given(menuRepository.findAllByOrderByUpperMenuNoAscMenuOrdrAsc()).willReturn(List.of(menu));

        Long rootId = menuService.getRootMenuIdByUrl("/url1");

        assertThat(rootId).isEqualTo(10L);
    }

    @Test
    @DisplayName("메뉴 관리 목록 조회")
    void selectMenuManageList() {
        Menu menu = Menu.builder().id(1L).menuNm("Menu").build();
        Object[] result = new Object[]{menu, null};
        given(menuRepository.findAllWithPrograms()).willReturn(Collections.singletonList(result));

        List<MenuDto> list = menuService.selectMenuManageList(new ComDefaultVO());

        assertThat(list).hasSize(1);
    }

    @Test
    @DisplayName("메뉴 생성 관리 목록 조회")
    void selectMenuCreatManagList() {
        ComDefaultVO vo = new ComDefaultVO();
        vo.setPageIndex(1);
        vo.setRecordCountPerPage(10);
        
        given(menuAuthorityRepository.selectMenuCreatManagList(anyString(), any())).willReturn(new PageImpl<>(new ArrayList<>()));

        List<MenuCreateDto> list = menuService.selectMenuCreatManagList(vo);

        assertThat(list).isEmpty();
    }

    @Test
    @DisplayName("권한별 메뉴 생성 목록 저장")
    void insertMenuCreatList() {
        menuService.insertMenuCreatList("ROLE_USER", "1,2");
        verify(menuAuthorityRepository).deleteByIdAuthorCode("ROLE_USER");
        verify(menuAuthorityRepository).saveAll(anyList());
    }
}
