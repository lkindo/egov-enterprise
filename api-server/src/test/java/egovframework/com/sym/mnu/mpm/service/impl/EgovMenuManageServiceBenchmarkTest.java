package egovframework.com.sym.mnu.mpm.service.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.ByteArrayInputStream;
import java.io.InputStream;

import org.apache.poi.hssf.usermodel.HSSFRow;
import org.apache.poi.hssf.usermodel.HSSFSheet;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.egovframe.rte.fdl.excel.EgovExcelService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.company.project.domain.menu.Menu;
import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.Program;
import com.company.project.domain.program.ProgramRepository;

import egovframework.com.sym.mnu.mpm.service.MenuManageVO;
import egovframework.com.sym.prm.service.impl.ProgrmManageDAO;

@ExtendWith(MockitoExtension.class)
class EgovMenuManageServiceBenchmarkTest {

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
    void testBatchRegistrationOptimized() throws Exception {
        // Create a Mock Workbook with 10 rows
        HSSFWorkbook wb = new HSSFWorkbook();
        HSSFSheet progrmSheet = wb.createSheet("Program");
        HSSFSheet menuSheet = wb.createSheet("Menu");

        // Header
        progrmSheet.createRow(0);
        menuSheet.createRow(0);

        int rowCount = 10;

        for (int i = 1; i <= rowCount; i++) {
            HSSFRow pRow = progrmSheet.createRow(i);
            pRow.createCell(0).setCellValue("file" + i);
            pRow.createCell(1).setCellValue("name" + i);
            pRow.createCell(2).setCellValue("path" + i);
            pRow.createCell(3).setCellValue("url" + i);
            pRow.createCell(4).setCellValue("dc" + i);

            HSSFRow mRow = menuSheet.createRow(i);
            mRow.createCell(0).setCellValue(i); // menuNo
            mRow.createCell(1).setCellValue(i); // menuOrdr
            mRow.createCell(2).setCellValue("Menu" + i);
            mRow.createCell(3).setCellValue(0); // upperMenuId
            mRow.createCell(4).setCellValue("desc");
            mRow.createCell(5).setCellValue("path");
            mRow.createCell(6).setCellValue("name");
            mRow.createCell(7).setCellValue("file" + i);
        }

        when(excelZipService.loadWorkbook(any(InputStream.class))).thenReturn(wb);

        menuManageService.menuBndeRegist(new MenuManageVO(), new ByteArrayInputStream(new byte[0]));

        // OPTIMIZED: Expect saveAll() to be called once
        verify(menuRepository).saveAll(any());
        verify(programRepository).saveAll(any());

        // Ensure save() is NOT called
        verify(menuRepository, org.mockito.Mockito.never()).save(any(Menu.class));
        verify(programRepository, org.mockito.Mockito.never()).save(any(Program.class));
    }
}
