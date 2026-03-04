package com.company.project.domain.system.monitoring;

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
@DisplayName("System Monitoring Save 테스트")
class SystemMonitoringSaveTest {

    @Autowired
    private DbMntrngRepository dbMntrngRepository;
    @Autowired
    private FileSysMntrngRepository fileSysMntrngRepository;
    @Autowired
    private HttpMonRepository httpMonRepository;
    @Autowired
    private ProcessMonRepository processMonRepository;
    @Autowired
    private ServerResrceLogRepository serverResrceLogRepository;

    @Test
    @DisplayName("DB 모니터링 저장")
    void dbMntrngSave() {
        DbMntrng entity = DbMntrng.builder().dataSourcNm("DS_001").serverNm("localhost").dbmsKind("01").build();
        dbMntrngRepository.save(entity);
        assertThat(dbMntrngRepository.findById("DS_001")).isPresent();
    }

    @Test
    @DisplayName("파일시스템 모니터링 저장")
    void fileSysSave() {
        FileSysMntrng entity = FileSysMntrng.builder().fileSysId("FS_001").fileSysNm("/dev/sda").mntrngSttus("01")
                .build();
        fileSysMntrngRepository.save(entity);
        assertThat(fileSysMntrngRepository.findById("FS_001")).isPresent();
    }

    @Test
    @DisplayName("HTTP 모니터링 저장")
    void httpMonSave() {
        HttpMon entity = HttpMon.builder().sysId("SYS_001").siteUrl("http://localhost").httpSttusCd("200").build();
        httpMonRepository.save(entity);
        assertThat(httpMonRepository.findById("SYS_001")).isPresent();
    }

    @Test
    @DisplayName("서버 자원 로그 저장")
    void serverResLogSave() {
        ServerResrceLog entity = ServerResrceLog.builder().logId("LOG_001").creatDt(LocalDateTime.now()).build();
        serverResrceLogRepository.save(entity);
        assertThat(serverResrceLogRepository.findById("LOG_001")).isPresent();
    }

    @Test
    @DisplayName("프로세스 모니터링 저장")
    void processMonSave() {
        ProcessMon entity = ProcessMon.builder().processNm("java").procsSttus("01").build();
        processMonRepository.save(entity);
        assertThat(processMonRepository.findById("java")).isPresent();
    }
}
