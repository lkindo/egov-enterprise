package com.company.project.service.menu;

import com.company.project.domain.menu.MenuRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

@Slf4j
@Component
@RequiredArgsConstructor
public class MenuDataInitializer implements CommandLineRunner {

    private final MenuRepository menuRepository;
    private final JdbcTemplate jdbcTemplate;

    // 하드코딩된 절대 경로 대신 프로젝트 내부의 템플릿 SQL 파일을 참조하도록 수정
    private File scriptFile = new File("egovframe-template-common-components-5.0.0/script/dml/postgres/com_DML_postgres.sql");

    public void setScriptFile(File scriptFile) {
        this.scriptFile = scriptFile;
    }

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

        if (!scriptFile.exists()) {
            log.warn("Legacy SQL file not found at: {}. Current working directory: {}", scriptFile.getAbsolutePath(),
                    System.getProperty("user.dir"));
            return;
        }

        Charset charset = detectCharset(scriptFile);
        if (charset == null) {
            log.error("Failed to detect charset for file: {}", scriptFile.getAbsolutePath());
            return;
        }

        if (!menuExists) {
            log.info("Processing NMENUINFO inserts...");
            processInserts(scriptFile, charset, "INSERT INTO NMENUINFO");
        }

        if (!programExists) {
            log.info("Processing NPROGRMLIST inserts...");
            processInserts(scriptFile, charset, "INSERT INTO NPROGRMLIST");
        }
    }

    private Charset detectCharset(File file) {
        try (java.util.stream.Stream<String> stream = Files.lines(file.toPath(), StandardCharsets.UTF_8)) {
            stream.forEach(line -> {});
            return StandardCharsets.UTF_8;
        } catch (Exception e) {
            try (java.util.stream.Stream<String> stream = Files.lines(file.toPath(), Charset.forName("EUC-KR"))) {
                stream.forEach(line -> {});
                return Charset.forName("EUC-KR");
            } catch (Exception e2) {
                log.error("Failed to read menu data file with UTF-8 or EUC-KR", e2);
                return null;
            }
        }
    }

    private void processInserts(File file, Charset charset, String tablePattern) {
        try (java.util.stream.Stream<String> lines = Files.lines(file.toPath(), charset)) {
            java.util.concurrent.atomic.AtomicInteger count = new java.util.concurrent.atomic.AtomicInteger(0);

            lines.filter(line -> line.contains(tablePattern))
                    .forEach(line -> {
                        String[] stmts = line.split(";");
                        for (String stmt : stmts) {
                            if (!stmt.trim().isEmpty()) {
                                try {
                                    jdbcTemplate.execute(stmt.trim());
                                    count.incrementAndGet();
                                } catch (Exception e) {
                                    log.error("Error executing SQL statement: {}", stmt.trim(), e);
                                }
                            }
                        }
                    });

            if (count.get() == 0) {
                log.warn("No {} insert statements found in the legacy SQL file.", tablePattern);
            } else {
                log.info("Successfully executed {} insert statements for {}.", count.get(), tablePattern);
            }
        } catch (IOException e) {
            log.error("Error reading file during insert processing", e);
        }
    }
}
