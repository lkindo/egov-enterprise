package egovframework.com.sym.mnu.mpm.service.impl;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.Program;
import com.company.project.domain.program.ProgramRepository;

import egovframework.com.cmm.ComDefaultVO;
import egovframework.com.sym.mnu.mpm.service.MenuManageVO;
import egovframework.com.sym.prm.service.impl.ProgrmManageDAO;
import org.egovframe.rte.fdl.excel.EgovExcelService;

@ExtendWith(MockitoExtension.class)
class EgovMenuManageServiceTest {

    @Mock
    private MenuRepository menuRepository;

    @Mock
    private ProgramRepository programRepository;

    @Mock
    private ProgrmManageDAO progrmManageDAO;

    @Mock
    private EgovExcelService excelZipService;

    @InjectMocks
    private EgovMenuManageServiceImpl menuManageService;

    @Test
    void selectMainMenuHead_ShouldCallOptimizedMethod() throws Exception {
        // Arrange
        Menu rootMenu = Menu.builder()
                .id(1L)
                .menuNm("Root Menu")
                .upperMenuNo(0L)
                .menuOrdr(1)
                .build();

        // The optimized implementation fetches only root menus (upperMenuNo = 0)
        when(menuRepository.findByUpperMenuNoOrderByMenuOrdrAsc(0L))
                .thenReturn(Arrays.asList(rootMenu));

        // Act
        List<MenuManageVO> result = menuManageService.selectMainMenuHead(new MenuManageVO());

        // Assert
        assertEquals(1, result.size());
        assertEquals("Root Menu", result.get(0).getMenuNm());

        // VERIFY: The OPTIMIZED method is called
        verify(menuRepository).findByUpperMenuNoOrderByMenuOrdrAsc(0L);
    }

    @Test
    void selectMainMenuLeft_ShouldCallOptimizedMethod() throws Exception {
        // Arrange
        Menu childMenu = Menu.builder()
                .id(2L)
                .menuNm("Child Menu")
                .upperMenuNo(1L)
                .menuOrdr(1)
                .build();

        // The optimized implementation fetches only children of the specific menu
        when(menuRepository.findByUpperMenuNoOrderByMenuOrdrAsc(1L))
                .thenReturn(Arrays.asList(childMenu));

        MenuManageVO vo = new MenuManageVO();
        vo.setMenuNo(1); // searching for children of menu 1

        // Act
        List<MenuManageVO> result = menuManageService.selectMainMenuLeft(vo);

        // Assert
        assertEquals(1, result.size());
        assertEquals("Child Menu", result.get(0).getMenuNm());

        // VERIFY: The OPTIMIZED method is called
        verify(menuRepository).findByUpperMenuNoOrderByMenuOrdrAsc(1L);
    }

    @Test
    void selectLastMenuURL_ShouldTraverseHierarchy() throws Exception {
        // Arrange
        Long rootId = 1L;
        Long childId = 2L;
        String finalUrl = "/test/url.do";
        String progrmFileNm = "TEST_PROGRAM";

        Menu rootMenu = Menu.builder().id(rootId).build();
        Menu childMenu = Menu.builder().id(childId).progrmFileNm(progrmFileNm).build();
        Program program = Program.builder().progrmFileNm(progrmFileNm).url(finalUrl).build();

        // Level 0: Root
        when(menuRepository.findById(rootId)).thenReturn(Optional.of(rootMenu));
        // Use findFirst instead of findBy...List
        when(menuRepository.findFirstByUpperMenuNoOrderByMenuOrdrAsc(rootId)).thenReturn(Optional.of(childMenu));

        // Level 1: Child (Leaf)
        // Should NOT fetch by ID again

        // Check for its children
        when(menuRepository.findFirstByUpperMenuNoOrderByMenuOrdrAsc(childId)).thenReturn(Optional.empty());

        // Leaf logic
        when(programRepository.findById(progrmFileNm)).thenReturn(Optional.of(program));

        // Act
        String result = menuManageService.selectLastMenuURL(rootId.intValue(), "uniqId");

        // Assert
        assertEquals(finalUrl, result);

        // Verify OPTIMIZED behavior
        verify(menuRepository).findById(rootId); // Initial lookup
        verify(menuRepository).findFirstByUpperMenuNoOrderByMenuOrdrAsc(rootId); // Traverse down

        // Verify absence of redundant lookups
        // findById(childId) should NOT be called.
        // Mockito verify(mock).findById(childId) is tricky if childId and rootId are different.
        // We verify that findById was called ONLY ONCE (for root).
        verify(menuRepository, org.mockito.Mockito.times(1)).findById(any());

        verify(menuRepository).findFirstByUpperMenuNoOrderByMenuOrdrAsc(childId);
    }
}
