package com.company.project.service.menu;

import com.company.project.domain.menu.MenuRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Component
@RequiredArgsConstructor
public class MenuDataInitializer implements CommandLineRunner {

    private final MenuRepository menuRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        boolean menuExists = menuRepository.count() > 0;
        Integer programCount = jdbcTemplate.queryForObject("SELECT count(*) FROM NPROGRMLIST", Integer.class);
        boolean programExists = programCount != null && programCount > 0;

        if (menuExists && programExists) {
            log.info("Menu and Program data already exists. Skipping initialization.");
            return;
        }

        log.info("Initializing menu and program data from legacy SQL file...");

        // 하드코딩된 절대 경로 대신 프로젝트 내부의 템플릿 SQL 파일을 참조하도록 수정
        File file = new File("egovframe-template-common-components-5.0.0/script/dml/postgres/com_DML_postgres.sql");
        if (!file.exists()) {
            log.warn("Legacy SQL file not found at: {}. Current working directory: {}", file.getAbsolutePath(),
                    System.getProperty("user.dir"));
            return;
        }

        List<String> lines;
        try {
            lines = Files.readAllLines(file.toPath(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            try {
                lines = Files.readAllLines(file.toPath(), Charset.forName("EUC-KR"));
            } catch (Exception e2) {
                log.error("Failed to read menu data file with UTF-8 or EUC-KR", e2);
                return;
            }
        }

        if (!menuExists) {
            log.info("Processing NMENUINFO inserts...");
            executeInserts(lines, "INSERT INTO NMENUINFO");
        }

        if (!programExists) {
            log.info("Processing NPROGRMLIST inserts...");
            executeInserts(lines, "INSERT INTO NPROGRMLIST");
        }
    }

    private void executeInserts(List<String> lines, String tablePattern) {
        String sql = lines.stream()
                .filter(line -> line.contains(tablePattern))
                .collect(Collectors.joining("\n"));

        if (sql.isEmpty()) {
            log.warn("No {} insert statements found in the legacy SQL file.", tablePattern);
            return;
        }

        String[] statements = sql.split(";");
        int count = 0;
        for (String stmt : statements) {
            if (!stmt.trim().isEmpty()) {
                try {
                    jdbcTemplate.execute(stmt.trim());
                    count++;
                } catch (Exception e) {
                    log.error("Error executing SQL statement: {}", stmt.trim(), e);
                }
            }
        }

        log.info("Successfully executed {} insert statements for {}.", count, tablePattern);
    }
}
