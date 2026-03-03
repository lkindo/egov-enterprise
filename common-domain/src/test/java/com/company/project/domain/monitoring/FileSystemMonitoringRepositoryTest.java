package com.company.project.domain.monitoring;

import com.company.project.TestJpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("FileSystemMonitoringRepository 테스트")
class FileSystemMonitoringRepositoryTest {

    @Autowired
    private FileSystemMonitoringRepository fileSystemMonitoringRepository;

    @Test
    @DisplayName("파일시스템 모니터링 저장 및 조회")
    void saveAndFind() {
        // Given
        FileSystemMonitoring m = FileSystemMonitoring.builder()
                .fileSysId("FS_001")
                .fileSysNm("ROOT")
                .fileSysManageNm("/dev/sda1")
                .fileSysSize(100L)
                .fileSysThrhld(90L)
                .mntrngSttus("01")
                .mngrNm("ADMIN")
                .frstRegisterId("SYSTEM")
                .build();

        // When
        fileSystemMonitoringRepository.save(m);
        Optional<FileSystemMonitoring> found = fileSystemMonitoringRepository.findById("FS_001");

        // Then
        assertThat(found).isPresent();
        assertThat(found.get().getFileSysNm()).isEqualTo("ROOT");
    }

    @Test
    @DisplayName("상태 업데이트 테스트")
    void updateStatus() {
        // Given
        FileSystemMonitoring m = FileSystemMonitoring.builder().fileSysId("FS_002").mntrngSttus("01").build();
        fileSystemMonitoringRepository.save(m);

        // When
        FileSystemMonitoring saved = fileSystemMonitoringRepository.findById("FS_002").orElseThrow();
        saved.updateStatus(200L, 150L, "02", LocalDateTime.now(), "USER");
        fileSystemMonitoringRepository.saveAndFlush(saved);

        // Then
        FileSystemMonitoring updated = fileSystemMonitoringRepository.findById("FS_002").orElseThrow();
        assertThat(updated.getMntrngSttus()).isEqualTo("02");
        assertThat(updated.getFileSysSize()).isEqualTo(200L);
    }
}
