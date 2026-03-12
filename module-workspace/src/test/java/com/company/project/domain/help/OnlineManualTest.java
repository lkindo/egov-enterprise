package com.company.project.domain.help;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("OnlineManual 엔티티 테스트")
class OnlineManualTest {

    @Test
    @DisplayName("OnlineManual 빌더 및 초기화 테스트")
    void builderTest() {
        OnlineManual manual = OnlineManual.builder()
                .onlineMnlId("MNL_001")
                .onlineMnlNm("User Manual")
                .onlineMnlSeCode("001")
                .onlineMnlDf("Definition")
                .onlineMnlDc("Manual Description")
                .frstRegisterId("admin")
                .build();

        assertThat(manual.getOnlineMnlId()).isEqualTo("MNL_001");
        assertThat(manual.getOnlineMnlNm()).isEqualTo("User Manual");
        assertThat(manual.getCreatedBy()).isEqualTo("admin");
    }

    @Test
    @DisplayName("OnlineManual 수정 테스트")
    void updateTest() {
        OnlineManual manual = OnlineManual.builder()
                .onlineMnlId("MNL_001")
                .onlineMnlNm("Old Manual")
                .build();

        manual.update("New Manual", "002", "New Df", "New Dc", "user03");

        assertThat(manual.getOnlineMnlNm()).isEqualTo("New Manual");
        assertThat(manual.getOnlineMnlSeCode()).isEqualTo("002");
        assertThat(manual.getOnlineMnlDf()).isEqualTo("New Df");
        assertThat(manual.getLastModifiedBy()).isEqualTo("user03");
    }
}
