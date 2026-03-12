package com.company.project.domain.system.service.survey;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("QustnrRespondInfo 엔티티 테스트")
class QustnrRespondInfoTest {

    @Test
    @DisplayName("QustnrRespondInfo 엔티티 빌더 및 초기화 테스트")
    void builderTest() {
        QustnrRespondInfo info = QustnrRespondInfo.builder()
                .qestnrQesrspnsId("RSP_001")
                .qestnrId("Q_001")
                .qestnrQesitmId("ITEM_001")
                .respondNm("Jane")
                .build();

        assertThat(info.getQestnrQesrspnsId()).isEqualTo("RSP_001");
        assertThat(info.getQestnrId()).isEqualTo("Q_001");
        assertThat(info.getRespondNm()).isEqualTo("Jane");
    }

    @Test
    @DisplayName("QustnrRespondInfo 엔티티 수정 테스트")
    void updateTest() {
        QustnrRespondInfo info = QustnrRespondInfo.builder()
                .respondAnswerCn("Old Answer")
                .build();

        info.update("New Answer", "New Jane", "Etc Answer");

        assertThat(info.getRespondAnswerCn()).isEqualTo("New Answer");
        assertThat(info.getRespondNm()).isEqualTo("New Jane");
        assertThat(info.getEtcAnswerCn()).isEqualTo("Etc Answer");
    }
}
