package com.company.project.foundation.service.menu;

import com.company.project.foundation.domain.menu.MenuRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import java.io.BufferedReader;
import java.io.File;
import java.util.Objects;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

@Slf4j
// @Component
@RequiredArgsConstructor
public class MenuDataInitializer implements CommandLineRunner {

    private final MenuRepository menuRepository;
    private final JdbcTemplate jdbcTemplate;

    // ??뱶?붾????? 寃쎈??????꾨줈??듃 ???????뵆??SQL ?????李몄???룄???젙
    private File scriptFile = new File(
            "egovframe-template-common-components-5.0.0/script/dml/postgres/com_DML_postgres.sql");

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

        processFile(scriptFile, charset, !menuExists, !programExists);
    }

    private Charset detectCharset(File file) {
        try (BufferedReader reader = Files.newBufferedReader(file.toPath(), StandardCharsets.UTF_8)) {
            char[] buffer = new char[8192];
            while (reader.read(buffer) != -1) {
                // Just read to validate encoding
            }
            return StandardCharsets.UTF_8;
        } catch (Exception e) {
            try (BufferedReader reader = Files.newBufferedReader(file.toPath(), Charset.forName("EUC-KR"))) {
                char[] buffer = new char[8192];
                while (reader.read(buffer) != -1) {
                    // Just read to validate encoding
                }
                return Charset.forName("EUC-KR");
            } catch (Exception e2) {
                log.error("Failed to read menu data file with UTF-8 or EUC-KR", e2);
                return null;
            }
        }
    }

    private void processFile(File file, Charset charset, boolean needMenu, boolean needProgram) {
        try (Stream<String> lines = Files.lines(file.toPath(), charset)) {
            AtomicInteger menuCount = new AtomicInteger(0);
            AtomicInteger programCount = new AtomicInteger(0);

            lines.forEach(line -> {
                if (line.contains("EgovMenuManageSelect") || line.contains("6140000")) {
                    log.debug("Skipping legacy batch menu/program statement: {}", line);
                    return;
                }
                if (needMenu && line.contains("INSERT INTO NMENUINFO")) {
                    executeStatements(line, menuCount);
                } else if (needProgram && line.contains("INSERT INTO NPROGRMLIST")) {
                    executeStatements(line, programCount);
                }
            });

            if (needMenu && menuCount.get() > 0) {
                log.info("Successfully executed {} insert statements for NMENUINFO.", menuCount.get());
            } else if (needMenu) {
                log.warn("No NMENUINFO insert statements found in the legacy SQL file.");
            }

            if (needProgram && programCount.get() > 0) {
                log.info("Successfully executed {} insert statements for NPROGRMLIST.", programCount.get());
            } else if (needProgram) {
                log.warn("No NPROGRMLIST insert statements found in the legacy SQL file.");
            }
        } catch (IOException e) {
            log.error("Error reading file during insert processing", e);
        }
    }

    private void executeStatements(String line, AtomicInteger count) {
        String[] stmts = line.split(";");
        for (String stmt : stmts) {
            if (!stmt.trim().isEmpty()) {
                try {
                    jdbcTemplate.execute(Objects.requireNonNull(stmt.trim()));
                    count.incrementAndGet();
                } catch (Exception e) {
                    log.error("Error executing SQL statement: {}", stmt.trim(), e);
                }
            }
        }
    }
}
