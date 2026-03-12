package com.company.project.domain.system.service.survey;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SurveyRespondent 엔티티 테스트")
class SurveyRespondentTest {

    @Test
    @DisplayName("SurveyRespondent 엔티티 빌더 및 초기화 테스트")
    void builderTest() {
        SurveyRespondent respondent = SurveyRespondent.builder()
                .qestnrRespondId("RES_001")
                .qestnrId("Q_001")
                .respondNm("John Doe")
                .sexdstnCode("M")
                .occpTyCode("O01")
                .frstRegisterId("admin")
                .build();

        assertThat(respondent.getQestnrRespondId()).isEqualTo("RES_001");
        assertThat(respondent.getQestnrId()).isEqualTo("Q_001");
        assertThat(respondent.getRespondNm()).isEqualTo("John Doe");
        assertThat(respondent.getSexdstnCode()).isEqualTo("M");
        assertThat(respondent.getCreatedBy()).isEqualTo("admin");
    }

    @Test
    @DisplayName("SurveyRespondent 엔티티 수정 테스트")
    void updateTest() {
        SurveyRespondent respondent = SurveyRespondent.builder()
                .qestnrRespondId("RES_001")
                .respondNm("Jane Doe")
                .build();

        respondent.update("F", "O02", "New Jane", "19900101", "02", "123", "4567", "staff");

        assertThat(respondent.getRespondNm()).isEqualTo("New Jane");
        assertThat(respondent.getSexdstnCode()).isEqualTo("F");
        assertThat(respondent.getOccpTyCode()).isEqualTo("O02");
        assertThat(respondent.getBrth()).isEqualTo("19900101");
        assertThat(respondent.getLastModifiedBy()).isEqualTo("staff");
    }
}
