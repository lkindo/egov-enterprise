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
@DisplayName("HttpMonitoringRepository 테스트")
class HttpMonitoringRepositoryTest {

    @Autowired
    private HttpMonitoringRepository httpMonitoringRepository;

    @Test
    @DisplayName("HTTP 모니터링 저장 및 조회")
    void saveAndFind() {
        // Given
        HttpMonitoring m = HttpMonitoring.builder()
                .sysId("SYS_001")
                .webKind("01")
                .siteUrl("http://portal.com")
                .httpSttusCd("200")
                .mngrNm("ADMIN")
                .frstRegisterId("SYSTEM")
                .build();

        // When
        httpMonitoringRepository.save(m);
        Optional<HttpMonitoring> found = httpMonitoringRepository.findById("SYS_001");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getSiteUrl()).isEqualTo("http://portal.com");
        assertThat(found.get().getDeleteAt()).isEqualTo("N");
    }

    @Test
    @DisplayName("HTTP 모니터링 삭제(논리) 테스트")
    void deleteTest() {
        // Given
        HttpMonitoring m = HttpMonitoring.builder().sysId("SYS_002").build();
        httpMonitoringRepository.save(m);

        // When
        HttpMonitoring saved = httpMonitoringRepository.findById("SYS_002").orElseThrow();
        saved.delete();
        httpMonitoringRepository.saveAndFlush(saved);

        // Then
        HttpMonitoring updated = httpMonitoringRepository.findById("SYS_002").orElseThrow();
        assertThat(updated.getDeleteAt()).isEqualTo("Y");
    }
}
