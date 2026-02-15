package egovframework.com.sym.sym.bak.service.impl;

import com.company.project.domain.backup.BackupOpert;
import com.company.project.domain.backup.BackupOpertRepository;
import com.company.project.domain.backup.BackupSchdulDfk;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:testdb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.datasource.username=sa",
        "spring.datasource.password=",
        "spring.sql.init.mode=always",
        "spring.sql.init.schema-locations=classpath:schema-h2.sql",
        "logging.level.com.company.project.domain.backup=DEBUG"
})
@Transactional
public class BackupOpertDaoTest {

    @Configuration
    @EnableAutoConfiguration
    @EntityScan(basePackages = "com.company.project.domain.backup")
    @EnableJpaRepositories(basePackages = "com.company.project.domain.backup")
    static class TestConfig {
    }

    @Autowired
    private BackupOpertRepository backupOpertRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    public void setup() {
        // Insert Common Codes
        // COM047: EXECUT_CYCLE (01: Daily, 02: Weekly, etc.)
        insertCode("COM047", "01", "매일");
        insertCode("COM047", "02", "매주");

        // COM049: CMPRS_SE (01: Yes, 02: No)
        insertCode("COM049", "01", "압축");
        insertCode("COM049", "02", "미압축");

        // COM074: EXECUT_SCHDUL_DFK_SE (1: Mon, 2: Tue ...)
        insertCode("COM074", "1", "월요일");
        insertCode("COM074", "2", "화요일");
    }

    private void insertCode(String codeId, String code, String codeNm) {
        jdbcTemplate.update(
                "INSERT INTO CCMMNDETAILCODE (CODE_ID, CODE, CODE_NM, USE_AT, LAST_UPDT_PNTTM) VALUES (?, ?, ?, 'Y', NOW())",
                codeId, code, codeNm);
    }

    @Test
    public void benchmarkSelectBackupOpertList() throws Exception {
        // 1. Prepare Data (100 records)
        int count = 100;
        for (int i = 0; i < count; i++) {
            String opertId = "BKP_" + String.format("%04d", i);
            BackupOpert vo = BackupOpert.builder()
                    .backupOpertId(opertId)
                    .backupOpertNm("Backup Job " + i)
                    .backupOrginlDrctry("/origin/" + i)
                    .backupStreDrctry("/target/" + i)
                    .cmprsSe("01")
                    .executCycle("02") // Weekly
                    .executSchdulDe("20231001")
                    .executSchdulHour("00")
                    .executSchdulMnt("00")
                    .executSchdulSecnd("00")
                    .useAt("Y")
                    .createdBy("admin")
                    .lastModifiedBy("admin")
                    .build();

            // Set Schedules (Mon, Tue)
            vo.getExecutSchdulDfkSes().add(new BackupSchdulDfk(opertId, "1", vo));
            vo.getExecutSchdulDfkSes().add(new BackupSchdulDfk(opertId, "2", vo));

            backupOpertRepository.save(vo);
        }

        // 2. Measure Performance
        long start = System.currentTimeMillis();
        List<BackupOpert> resultList = backupOpertRepository.findAll();
        long end = System.currentTimeMillis();

        System.out.println("Execution Time: " + (end - start) + " ms");
        System.out.println("Result Count: " + resultList.size());

        // 3. Verify correctness
        assertEquals(count, resultList.size());
        for (BackupOpert result : resultList) {
            assertNotNull(result.getExecutSchdulDfkSes());
            assertEquals(2, result.getExecutSchdulDfkSes().size());
        }
    }
}
