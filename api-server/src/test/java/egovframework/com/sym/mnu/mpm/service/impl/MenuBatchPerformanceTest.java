package egovframework.com.sym.mnu.mpm.service.impl;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

import org.apache.poi.hssf.usermodel.HSSFRow;
import org.apache.poi.hssf.usermodel.HSSFSheet;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;

import com.company.project.domain.menu.MenuRepository;
import com.company.project.domain.program.ProgramRepository;

import egovframework.com.sym.mnu.mpm.service.MenuManageVO;
import egovframework.com.sym.prm.service.impl.ProgrmManageDAO;
import org.egovframe.rte.fdl.excel.EgovExcelService;

import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Bean;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;

@DataJpaTest
@Import(EgovMenuManageServiceImpl.class)
@TestPropertySource(properties = {
    "spring.jpa.properties.hibernate.jdbc.batch_size=50", // Optimized
    "spring.jpa.properties.hibernate.order_inserts=true"
})
public class MenuBatchPerformanceTest {

    @Configuration
    @EnableJpaRepositories(basePackages = {"com.company.project.domain", "egovframework"})
    @EntityScan(basePackages = {"com.company.project.domain", "egovframework"})
    static class Config {
        @Bean
        public JPAQueryFactory jpaQueryFactory(EntityManager em) {
            return new JPAQueryFactory(em);
        }
    }

    @Autowired
    private EgovMenuManageServiceImpl menuManageService;

    @Autowired
    private MenuRepository menuRepository;

    @Autowired
    private ProgramRepository programRepository;

    @MockBean
    private ProgrmManageDAO progrmManageDAO;

    @MockBean
    private EgovExcelService excelZipService;

    @MockBean(name = "leaveaTrace")
    private org.egovframe.rte.fdl.cmmn.trace.LeaveaTrace leaveaTrace;

    private HSSFWorkbook workbook;

    @BeforeEach
    public void setUp() {
        // Prepare a workbook with data
        workbook = new HSSFWorkbook();
        HSSFSheet progrmSheet = workbook.createSheet("Program");
        HSSFSheet menuSheet = workbook.createSheet("Menu");

        // Headers
        progrmSheet.createRow(0);
        menuSheet.createRow(0);

        // Generate data
        int rowCount = 2000; // Enough to show difference

        for (int i = 1; i <= rowCount; i++) {
            // Program
            HSSFRow progRow = progrmSheet.createRow(i);
            progRow.createCell(0).setCellValue("prog" + i + ".do");
            progRow.createCell(1).setCellValue("Program " + i);
            progRow.createCell(2).setCellValue("/path/" + i);
            progRow.createCell(3).setCellValue("/url/" + i + ".do");
            progRow.createCell(4).setCellValue("Desc " + i);

            // Menu
            HSSFRow menuRow = menuSheet.createRow(i);
            menuRow.createCell(0).setCellValue(i); // menuNo
            menuRow.createCell(1).setCellValue(i); // menuOrdr
            menuRow.createCell(2).setCellValue("Menu " + i);
            menuRow.createCell(3).setCellValue(0); // upperMenuId
            menuRow.createCell(4).setCellValue("Desc " + i);
            menuRow.createCell(5).setCellValue("/img/" + i);
            menuRow.createCell(6).setCellValue("img" + i + ".png");
            menuRow.createCell(7).setCellValue("prog" + i + ".do");
        }
    }

    @Test
    public void measureBatchRegistration() throws Exception {
        when(excelZipService.loadWorkbook(any(InputStream.class))).thenReturn(workbook);

        // Ensure clean state
        menuRepository.deleteAll();
        programRepository.deleteAll();

        long startTime = System.currentTimeMillis();

        menuManageService.menuBndeRegist(new MenuManageVO(), new java.io.ByteArrayInputStream(new byte[0]));

        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;

        System.out.println("Execution Time (Batch Size 50): " + duration + " ms");
    }
}
