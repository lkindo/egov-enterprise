package com.company.project.foundation.domain.log;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("로그 통계 Summary 엔티티 단위 테스트")
class LogSummaryTest {

    @Test
    @DisplayName("BbsSummary 생성 및 복합키 확인")
    void bbsSummaryTest() {
        BbsSummary summary = BbsSummary.builder()
                .occrrncDe("20241227")
                .statsKind("STAT")
                .detailStatsKind("DET")
                .creatCo(100L)
                .totInqireCo(500L)
                .avrgInqireCo(5.0)
                .build();

        assertThat(summary.getOccrrncDe()).isEqualTo("20241227");
        assertThat(summary.getCreatCo()).isEqualTo(100L);

        BbsSummaryId id1 = new BbsSummaryId("20241227", "S", "D");
        BbsSummaryId id2 = new BbsSummaryId("20241227", "S", "D");
        assertThat(id1).isEqualTo(id2);
        assertThat(id1.getOccrrncDe()).isEqualTo("20241227");
    }

    @Test
    @DisplayName("SysLogSummary 생성 및 복합키 확인")
    void sysLogSummaryTest() {
        SysLogSummary summary = SysLogSummary.builder()
                .srvcNm("Srvc")
                .methodNm("Meth")
                .occrrncDe("20241227")
                .rdcnt(10L)
                .build();

        assertThat(summary.getSrvcNm()).isEqualTo("Srvc");
        
        SysLogSummaryId id1 = new SysLogSummaryId("S", "M", "20241227");
        SysLogSummaryId id2 = new SysLogSummaryId("S", "M", "20241227");
        assertThat(id1).isEqualTo(id2);
    }

    @Test
    @DisplayName("UserSummary 생성 및 복합키 확인")
    void userSummaryTest() {
        UserSummary summary = UserSummary.builder()
                .occrrncDe("20241227")
                .statsKind("LGN")
                .detailStatsKind("WWW")
                .userCo(50L)
                .build();

        assertThat(summary.getUserCo()).isEqualTo(50L);

        UserSummaryId id1 = new UserSummaryId("20241227", "L", "W");
        UserSummaryId id2 = new UserSummaryId("20241227", "L", "W");
        assertThat(id1).isEqualTo(id2);
    }

    @Test
    @DisplayName("WebLogSummary 생성 및 복합키 확인")
    void webLogSummaryTest() {
        WebLogSummary summary = WebLogSummary.builder()
                .occrrncDe("20241227")
                .url("/test")
                .rdcnt(30L)
                .build();

        assertThat(summary.getUrl()).isEqualTo("/test");

        WebLogSummaryId id1 = new WebLogSummaryId("20241227", "/u");
        WebLogSummaryId id2 = new WebLogSummaryId("20241227", "/u");
        assertThat(id1).isEqualTo(id2);
        
        WebLogSummary summaryConstructor = new WebLogSummary("20241227", "/test", 10L);
        assertThat(summaryConstructor.getUrl()).isEqualTo("/test");
    }
}
