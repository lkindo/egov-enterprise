package com.company.project.domain.monitoring;

import com.company.project.TestJpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("Monitoring 로그 리포지토리 통합 테스트")
class MonitoringLogRepositoryTest {

    @Autowired
    private DbMonitoringLogRepository dbMonitoringLogRepository;

    @Autowired
    private FileSystemMonitoringLogRepository fileSystemMonitoringLogRepository;

    @Autowired
    private HttpMonitoringLogRepository httpMonitoringLogRepository;

    @Autowired
    private ProcessMonitoringLogRepository processMonitoringLogRepository;

    @Test
    @DisplayName("DB 모니터링 로그 저장")
    void saveDbLog() {
        DbMonitoringLog log = DbMonitoringLog.builder()
                .logId("DBLOG_001")
                .dataSourcNm("TEST_DS")
                .serverNm("TEST_SERVER")
                .mntrngSttus("01")
                .build();
        dbMonitoringLogRepository.save(log);
        assertThat(dbMonitoringLogRepository.findAll()).isNotEmpty();
    }

    @Test
    @DisplayName("파일시스템 모니터링 로그 저장")
    void saveFsLog() {
        FileSystemMonitoringLog log = FileSystemMonitoringLog.builder()
                .logId("FSLOG_001")
                .fileSysId("FS_001")
                .mntrngSttus("01")
                .creatDt(LocalDateTime.now())
                .build();
        fileSystemMonitoringLogRepository.save(log);
        assertThat(fileSystemMonitoringLogRepository.findAll()).isNotEmpty();
    }

    @Test
    @DisplayName("HTTP 모니터링 로그 저장")
    void saveHttpLog() {
        HttpMonitoringLog log = HttpMonitoringLog.builder()
                .logId("HTTPLOG_001")
                .sysId("HTTP_001")
                .webKind("01")
                .siteUrl("http://test.com")
                .httpSttusCd("200")
                .creatDt(LocalDateTime.now())
                .build();
        httpMonitoringLogRepository.save(log);
        assertThat(httpMonitoringLogRepository.findAll()).isNotEmpty();
    }

    @Test
    @DisplayName("프로세스 모니터링 로그 저장")
    void saveProcessLog() {
        ProcessMonitoringLog log = ProcessMonitoringLog.builder()
                .logId("PROCLOG_001")
                .processNm("TEST_PROC")
                .procsSttus("01")
                .creatDt(LocalDateTime.now())
                .build();
        processMonitoringLogRepository.save(log);
        assertThat(processMonitoringLogRepository.findAll()).isNotEmpty();
    }
}
