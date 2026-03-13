package com.company.project.domain.help;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("OnlineManual 엔티티 테스트")
class OnlineManualTest {

    @Test
    @DisplayName("OnlineManual 빌더 및 초기화 테스트")
    void builderTest() {
        OnlineManual mnl = OnlineManual.builder()
                .onlineMnlId("MNL_001")
                .onlineMnlNm("Manual 1")
                .onlineMnlSeCode("001")
                .createdBy("admin")
                .build();

        assertThat(mnl.getOnlineMnlId()).isEqualTo("MNL_001");
        assertThat(mnl.getOnlineMnlNm()).isEqualTo("Manual 1");
        assertThat(mnl.getFrstRegisterId()).isEqualTo("admin");
    }

    @Test
    @DisplayName("OnlineManual 수정 테스트")
    void updateTest() {
        OnlineManual mnl = OnlineManual.builder()
                .onlineMnlId("MNL_001")
                .build();

        mnl.update("New Name", "002", "Df", "Dc", "user02");

        assertThat(mnl.getOnlineMnlNm()).isEqualTo("New Name");
        assertThat(mnl.getLastModifiedBy()).isEqualTo("user02");
    }
}
