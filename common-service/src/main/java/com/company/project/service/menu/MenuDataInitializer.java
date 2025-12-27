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
        if (menuRepository.count() > 0) {
            log.info("Menu data already exists. Skipping initialization.");
            return;
        }

        log.info("Initializing menu data from legacy SQL file...");

        File file = new File("d:/project/egov-enterprise/_legacy_backup/DATABASE/postgres/all_ebt_data_postgres.sql");
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

        String sql = lines.stream()
                .filter(line -> line.contains("INSERT INTO NMENUINFO"))
                .collect(Collectors.joining("\n"));

        if (sql.isEmpty()) {
            log.warn("No NMENUINFO insert statements found in the legacy SQL file.");
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

        log.info("Successfully initialized {} menu items.", count);
    }
}
