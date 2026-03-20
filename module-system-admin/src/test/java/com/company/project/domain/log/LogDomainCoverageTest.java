package com.company.project.domain.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import java.time.LocalDateTime;
import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("로그 도메인 엔티티 커버리지 테스트")
class LogDomainCoverageTest {

    @Test
    @DisplayName("LoginLog 엔티티 커버리지")
    void loginLog_Coverage() {
        LoginLog log = LoginLog.builder()
                .logId("LOG_001")
                .creatDt(LocalDateTime.now())
                .loginId("user01")
                .loginIp("127.0.0.1")
                .loginMthd("ID/PW")
                .errOccrrAt("N")
                .errorCode("NONE")
                .build();

        assertThat(log.getLogId()).isEqualTo("LOG_001");
        assertThat(log.getLoginId()).isEqualTo("user01");
        assertThat(log.getErrOccrrAt()).isEqualTo("N");
    }

    @Test
    @DisplayName("SysLog 엔티티 커버리지")
    void sysLog_Coverage() {
        SysLog log = SysLog.builder()
                .requstId("REQ_001")
                .occrrncDe("2024-01-01")
                .srvcNm("StatsService")
                .methodNm("getStats")
                .processSeCode("REQ")
                .processTime("100")
                .rqesterIp("127.0.0.1")
                .rqesterId("admin")
                .build();

        assertThat(log.getRequstId()).isEqualTo("REQ_001");
        assertThat(log.getSrvcNm()).isEqualTo("StatsService");
        assertThat(log.getProcessTime()).isEqualTo("100");
    }

    @Test
    @DisplayName("BbsSummary 엔티티 커버리지")
    void bbsSummary_Coverage() {
        BbsSummary summary = BbsSummary.builder()
                .occrrncDe("2024-01-01")
                .statsKind("BBS")
                .detailStatsKind("NOTICE")
                .creatCo(10L)
                .totInqireCo(100L)
                .build();

        assertThat(summary.getOccrrncDe()).isEqualTo("2024-01-01");
        assertThat(summary.getCreatCo()).isEqualTo(10L);
        
        BbsSummaryId id = new BbsSummaryId("2024-01-01", "BBS", "NOTICE");
        assertThat(id.getOccrrncDe()).isEqualTo("2024-01-01");
    }
}
