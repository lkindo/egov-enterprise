package com.company.project.domain.system.monitoring;

import com.company.project.TestJpaConfig;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(TestJpaConfig.class)
@ActiveProfiles("test")
@DisplayName("System Monitoring Repository 통합 테스트")
class SystemMonitoringRepositoryTest {

    @Autowired
    private DbMntrngRepository dbMntrngRepository;
    @Autowired
    private DbMntrngLogRepository dbMntrngLogRepository;
    @Autowired
    private FileSysMntrngRepository fileSysMntrngRepository;
    @Autowired
    private FileSysMntrngLogRepository fileSysMntrngLogRepository;
    @Autowired
    private HttpMonRepository httpMonRepository;
    @Autowired
    private HttpMonLogRepository httpMonLogRepository;
    @Autowired
    private ProcessMonRepository processMonRepository;
    @Autowired
    private ProcessMonLogRepository processMonLogRepository;
    @Autowired
    private ServerResrceLogRepository serverResrceLogRepository;
    @Autowired
    private NtwrkSvcMntrngRepository ntwrkSvcMntrngRepository;
    @Autowired
    private NtwrkSvcMntrngLogRepository ntwrkSvcMntrngLogRepository;
    @Autowired
    private TrsmrcvMntrngRepository trsmrcvMntrngRepository;
    @Autowired
    private TrsmrcvMntrngLogRepository trsmrcvMntrngLogRepository;

    @Test
    @DisplayName("전체 리포지토리 로딩 및 카운트 테스트")
    void checkRepositories() {
        assertThat(dbMntrngRepository.count()).isGreaterThanOrEqualTo(0);
        assertThat(dbMntrngLogRepository.count()).isGreaterThanOrEqualTo(0);
        assertThat(fileSysMntrngRepository.count()).isGreaterThanOrEqualTo(0);
        assertThat(fileSysMntrngLogRepository.count()).isGreaterThanOrEqualTo(0);
        assertThat(httpMonRepository.count()).isGreaterThanOrEqualTo(0);
        assertThat(httpMonLogRepository.count()).isGreaterThanOrEqualTo(0);
        assertThat(processMonRepository.count()).isGreaterThanOrEqualTo(0);
        assertThat(processMonLogRepository.count()).isGreaterThanOrEqualTo(0);
        assertThat(serverResrceLogRepository.count()).isGreaterThanOrEqualTo(0);
        assertThat(ntwrkSvcMntrngRepository.count()).isGreaterThanOrEqualTo(0);
        assertThat(ntwrkSvcMntrngLogRepository.count()).isGreaterThanOrEqualTo(0);
        assertThat(trsmrcvMntrngRepository.count()).isGreaterThanOrEqualTo(0);
        assertThat(trsmrcvMntrngLogRepository.count()).isGreaterThanOrEqualTo(0);
    }
}
