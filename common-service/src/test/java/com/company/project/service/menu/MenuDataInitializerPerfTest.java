package com.company.project.service.menu;

import com.company.project.domain.menu.MenuRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.IOException;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MenuDataInitializerPerfTest {

    @Mock
    private MenuRepository menuRepository;

    @Mock
    private JdbcTemplate jdbcTemplate;

    private MenuDataInitializer initializer;
    private File tempFile;

    @BeforeEach
    void setUp() throws IOException {
        initializer = new MenuDataInitializer(menuRepository, jdbcTemplate);
        tempFile = File.createTempFile("large_test_sql", ".sql");
        generateLargeFile(tempFile, 200000); // 200k lines
        initializer.setScriptFile(tempFile);
    }

    @AfterEach
    void tearDown() {
        if (tempFile != null && tempFile.exists()) {
            tempFile.delete();
        }
    }

    private void generateLargeFile(File file, int lines) throws IOException {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(file))) {
            for (int i = 0; i < lines; i++) {
                if (i % 2 == 0) {
                    writer.write("INSERT INTO NMENUINFO VALUES (" + i + ", 'Menu " + i + "');");
                } else {
                    writer.write("INSERT INTO NPROGRMLIST VALUES (" + i + ", 'Program " + i + "');");
                }
                writer.newLine();
            }
        }
    }

    @Test
    void benchmarkRun() throws Exception {
        lenient().when(menuRepository.count()).thenReturn(0L);
        lenient().when(jdbcTemplate.queryForObject(anyString(), eq(Integer.class))).thenReturn(0);

        // Mock execute to simulate DB work (fast)
        lenient().doAnswer(invocation -> null).when(jdbcTemplate).execute(anyString());

        long start = System.nanoTime();
        initializer.run();
        long end = System.nanoTime();

        System.out.println("Execution Time: " + (end - start) / 1_000_000.0 + " ms");

        // Verify that all lines were executed
        verify(jdbcTemplate, times(200000)).execute(anyString());
    }
}
