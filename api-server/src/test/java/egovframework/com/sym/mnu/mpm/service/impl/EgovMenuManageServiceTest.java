package egovframework.com.sym.mnu.mpm.service.impl;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.times;

import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import org.apache.poi.hssf.usermodel.HSSFRow;
import org.apache.poi.hssf.usermodel.HSSFSheet;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
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
    void deleteMenuManageList_ShouldCallDeleteAllById() throws Exception {
        // Arrange
        String checkedMenuNoForDel = "1,2,3";
        List<Long> expectedIds = Arrays.asList(1L, 2L, 3L);

        // Act
        menuManageService.deleteMenuManageList(checkedMenuNoForDel);

        // Assert
        verify(menuRepository).deleteAllById(expectedIds);
        verify(menuRepository, org.mockito.Mockito.never()).deleteById(any());
    }

    @Test
    void menuBndeRegist_ShouldUseBatchSave() throws Exception {
        // Arrange
        HSSFWorkbook workbook = new HSSFWorkbook();
        HSSFSheet progrmSheet = workbook.createSheet("Program");
        HSSFSheet menuSheet = workbook.createSheet("Menu");

        // Create Header (Row 0) - implementation skips it
        progrmSheet.createRow(0);
        menuSheet.createRow(0);

        // Create Data Row 1 for Program
        HSSFRow progRow = progrmSheet.createRow(1);
        progRow.createCell(0).setCellValue("testProgram.do");
        progRow.createCell(1).setCellValue("Test Program");
        progRow.createCell(2).setCellValue("/path/to/program");
        progRow.createCell(3).setCellValue("/test.do");
        progRow.createCell(4).setCellValue("Description");

        // Create Data Row 1 for Menu
        HSSFRow menuRow = menuSheet.createRow(1);
        menuRow.createCell(0).setCellValue(100); // menuNo
        menuRow.createCell(1).setCellValue(1);   // menuOrdr
        menuRow.createCell(2).setCellValue("Test Menu");
        menuRow.createCell(3).setCellValue(0);   // upperMenuId
        menuRow.createCell(4).setCellValue("Menu Desc");
        menuRow.createCell(5).setCellValue("/img/path");
        menuRow.createCell(6).setCellValue("img.png");
        menuRow.createCell(7).setCellValue("testProgram.do");

        when(excelZipService.loadWorkbook(any(InputStream.class))).thenReturn(workbook);
        when(programRepository.count()).thenReturn(0L);
        when(menuRepository.count()).thenReturn(0L);

        // Act
        menuManageService.menuBndeRegist(new MenuManageVO(), new java.io.ByteArrayInputStream(new byte[0]));

        // Assert
        // Expect saveAll to be called once for each repository
        verify(programRepository).saveAll(any(List.class));
        verify(menuRepository).saveAll(any(List.class));

        // Ensure individual save is NOT called
        verify(programRepository, times(0)).save(any(Program.class));
        verify(menuRepository, times(0)).save(any(Menu.class));
    }
}
