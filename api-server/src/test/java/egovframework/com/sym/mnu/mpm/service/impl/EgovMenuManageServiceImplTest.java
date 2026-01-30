package egovframework.com.sym.mnu.mpm.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import org.egovframe.rte.fdl.excel.EgovExcelService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.ProgramRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.sym.mnu.mpm.service.MenuManageVO;
import egovframework.com.sym.prm.service.impl.ProgrmManageDAO;

@ExtendWith(MockitoExtension.class)
class EgovMenuManageServiceImplTest {

    @InjectMocks
    private EgovMenuManageServiceImpl menuManageService;

    @Mock
    private MenuRepository menuRepository;

    @Mock
    private ProgramRepository programRepository;

    @Mock
    private ProgrmManageDAO progrmManageDAO;

    @Mock
    private EgovExcelService excelZipService;

    @Test
    @DisplayName("selectMainMenuHead should call findByUpperMenuNoOrderByMenuOrdrAsc(0L)")
    void selectMainMenuHead_shouldCallOptimizedRepositoryMethod() throws Exception {
        // Given
        Menu menu1 = Menu.builder().id(1L).menuNm("Head1").upperMenuNo(0L).menuOrdr(1).build();
        Menu menu2 = Menu.builder().id(2L).menuNm("Head2").upperMenuNo(0L).menuOrdr(2).build();
        given(menuRepository.findByUpperMenuNoOrderByMenuOrdrAsc(0L)).willReturn(Arrays.asList(menu1, menu2));

        // When
        List<MenuManageVO> result = menuManageService.selectMainMenuHead(new MenuManageVO());

        // Then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getMenuNm()).isEqualTo("Head1");
        verify(menuRepository).findByUpperMenuNoOrderByMenuOrdrAsc(0L);
    }

    @Test
    @DisplayName("selectMainMenuLeft should call findByUpperMenuNoOrderByMenuOrdrAsc(parentId)")
    void selectMainMenuLeft_shouldCallOptimizedRepositoryMethod() throws Exception {
        // Given
        Long parentId = 10L;
        MenuManageVO vo = new MenuManageVO();
        vo.setMenuNo(parentId.intValue());

        Menu child1 = Menu.builder().id(11L).menuNm("Child1").upperMenuNo(parentId).menuOrdr(1).build();
        given(menuRepository.findByUpperMenuNoOrderByMenuOrdrAsc(parentId)).willReturn(Collections.singletonList(child1));

        // When
        List<MenuManageVO> result = menuManageService.selectMainMenuLeft(vo);

        // Then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getMenuNm()).isEqualTo("Child1");
        verify(menuRepository).findByUpperMenuNoOrderByMenuOrdrAsc(parentId);
    }

    @Test
    @DisplayName("selectLastMenuURL should use optimized repository method recursively")
    void selectLastMenuURL_shouldCallOptimizedRepositoryMethod() throws Exception {
        // Given
        int rootId = 1;
        String uniqId = "test";

        Menu rootMenu = Menu.builder().id(1L).menuNm("Root").upperMenuNo(0L).menuOrdr(1).build();
        Menu childMenu = Menu.builder().id(2L).menuNm("Child").upperMenuNo(1L).menuOrdr(1).progrmFileNm("prog1").build();

        given(menuRepository.findById(1L)).willReturn(Optional.of(rootMenu));
        given(menuRepository.findByUpperMenuNoOrderByMenuOrdrAsc(1L)).willReturn(Collections.singletonList(childMenu));

        // Mocking recursion: when checking child (id 2), it has no children
        given(menuRepository.findById(2L)).willReturn(Optional.of(childMenu));
        given(menuRepository.findByUpperMenuNoOrderByMenuOrdrAsc(2L)).willReturn(Collections.emptyList());

        // Mock program repository for URL lookup
        com.company.project.domain.program.Program program = com.company.project.domain.program.Program.builder().progrmFileNm("prog1").url("/test/url.do").build();
        given(programRepository.findById("prog1")).willReturn(Optional.of(program));

        // When
        String result = menuManageService.selectLastMenuURL(rootId, uniqId);

        // Then
        assertThat(result).isEqualTo("/test/url.do");
        verify(menuRepository).findByUpperMenuNoOrderByMenuOrdrAsc(1L);
        verify(menuRepository).findByUpperMenuNoOrderByMenuOrdrAsc(2L);
    }
}
