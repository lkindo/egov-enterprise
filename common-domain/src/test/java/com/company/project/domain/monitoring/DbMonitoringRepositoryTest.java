package com.company.project.domain.monitoring;

import com.company.project.TestJpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("DbMonitoringRepository 테스트")
class DbMonitoringRepositoryTest {

    @Autowired
    private DbMonitoringRepository dbMonitoringRepository;

    @Test
    @DisplayName("DB 모니터링 정보 저장 및 조회")
    void saveAndFind() {
        // Given
        DbMonitoring m = DbMonitoring.builder()
                .dataSourcNm("TEST_DB")
                .serverNm("TEST_SERVER")
                .dbmsKind("01")
                .ceckSql("SELECT 1")
                .mngrNm("ADMIN")
                .mngrEmailAddr("test@test.com")
                .mntrngSttus("01")
                .frstRegisterId("SYSTEM")
                .build();

        // When
        dbMonitoringRepository.save(m);
        Optional<DbMonitoring> found = dbMonitoringRepository.findById("TEST_DB");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getServerNm()).isEqualTo("TEST_SERVER");
        assertThat(found.get().getMngrNm()).isEqualTo("ADMIN");
    }

    @Test
    @DisplayName("DB 모니터링 정보 업데이트")
    void updateMonitoring() {
        // Given
        DbMonitoring m = DbMonitoring.builder()
                .dataSourcNm("UPDATE_DB")
                .serverNm("OLD_SERVER")
                .build();
        dbMonitoringRepository.save(m);

        // When
        DbMonitoring saved = dbMonitoringRepository.findById("UPDATE_DB").orElseThrow();
        saved.update("NEW_SERVER", "02", "SELECT 2", "USER", "user@test.com", "02", "ADMIN");
        dbMonitoringRepository.saveAndFlush(saved);

        // Then
        DbMonitoring updated = dbMonitoringRepository.findById("UPDATE_DB").orElseThrow();
        assertThat(updated.getServerNm()).isEqualTo("NEW_SERVER");
        assertThat(updated.getMngrNm()).isEqualTo("USER");
        assertThat(updated.getMntrngSttus()).isEqualTo("02");
    }
}
