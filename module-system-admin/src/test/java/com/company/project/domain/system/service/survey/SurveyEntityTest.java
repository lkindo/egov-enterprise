package com.company.project.domain.system.service.survey;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("설문조사 관련 엔티티 테스트")
class SurveyEntityTest {

    @Test
    @DisplayName("OnlinePollItem 테스트")
    void onlinePollItemTest() {
        OnlinePollItem item = OnlinePollItem.builder()
                .pollIemId("ITEM_001")
                .pollId("POLL_001")
                .pollIemNm("Item 1")
                .build();

        assertThat(item.getPollIemId()).isEqualTo("ITEM_001");
        assertThat(item.getPollIemNm()).isEqualTo("Item 1");

        item.update("New Item 1");
        assertThat(item.getPollIemNm()).isEqualTo("New Item 1");
    }

    @Test
    @DisplayName("OnlinePollResult 테스트")
    void onlinePollResultTest() {
        OnlinePollResult result = OnlinePollResult.builder()
                .pollResultId("RES_001")
                .pollId("POLL_001")
                .pollIemId("ITEM_001")
                .createdBy("admin")
                .build();

        assertThat(result.getPollResultId()).isEqualTo("RES_001");
        assertThat(result.getCreatedBy()).isEqualTo("admin");
    }

    @Test
    @DisplayName("QestnrInfo 테스트")
    void qestnrInfoTest() {
        QestnrInfo info = QestnrInfo.builder()
                .qestnrId("QST_001")
                .qestnrSj("Subject")
                .qestnrTmplatId("TMP_001")
                .build();

        assertThat(info.getQestnrId()).isEqualTo("QST_001");
        assertThat(info.getQestnrSj()).isEqualTo("Subject");

        info.update("New Subject", "Purpose", "Guidance", "20240101", "20241231", "Target", "TMP_002");
        assertThat(info.getQestnrSj()).isEqualTo("New Subject");
        assertThat(info.getQestnrTmplatId()).isEqualTo("TMP_002");
    }

    @Test
    @DisplayName("QestnrTmplat 테스트")
    void qestnrTmplatTest() {
        QestnrTmplat tmplat = QestnrTmplat.builder()
                .qestnrTmplatId("TMP_001")
                .qestnrTmplatTy("Type A")
                .qestnrTmplatCn("Template Description")
                .qestnrTmplatImagepathnm("image.png")
                .build();

        assertThat(tmplat.getQestnrTmplatId()).isEqualTo("TMP_001");
        assertThat(tmplat.getQestnrTmplatTy()).isEqualTo("Type A");

        tmplat.update("Type B", "new_image.png", "New Cn");
        assertThat(tmplat.getQestnrTmplatTy()).isEqualTo("Type B");
        assertThat(tmplat.getQestnrTmplatCn()).isEqualTo("New Cn");
    }

    @Test
    @DisplayName("QustnrIem 테스트")
    void qustnrIemTest() {
        QustnrIem iem = QustnrIem.builder()
                .qustnrIemId("IEM_001")
                .qestnrId("QST_001")
                .qestnrQesitmId("ITEM_001")
                .iemCn("Option 1")
                .etcAnswerAt("N")
                .build();

        assertThat(iem.getQustnrIemId()).isEqualTo("IEM_001");
        assertThat(iem.getIemCn()).isEqualTo("Option 1");

        iem.update(1L, "Option 2", "Y");
        assertThat(iem.getIemCn()).isEqualTo("Option 2");
        assertThat(iem.getEtcAnswerAt()).isEqualTo("Y");
    }

    @Test
    @DisplayName("QustnrQesitm 테스트")
    void qustnrQesitmTest() {
        QustnrQesitm qesitm = QustnrQesitm.builder()
                .qestnrQesitmId("QES_001")
                .qestnrId("QST_001")
                .qestnrTmplatId("TMP_001")
                .qestnCn("Question Title")
                .qestnTyCode("1")
                .mxmmChoiseCo(1)
                .build();

        assertThat(qesitm.getQestnrQesitmId()).isEqualTo("QES_001");
        assertThat(qesitm.getQestnCn()).isEqualTo("Question Title");

        qesitm.update(1L, "2", "New Content", 2);
        assertThat(qesitm.getQestnCn()).isEqualTo("New Content");
        assertThat(qesitm.getQestnTyCode()).isEqualTo("2");
    }

    @Test
    @DisplayName("QustnrRespondInfo 테스트")
    void qustnrRespondInfoTest() {
        QustnrRespondInfo respondInfo = QustnrRespondInfo.builder()
                .qestnrQesrspnsId("RSP_001")
                .qestnrId("QST_001")
                .qestnrTmplatId("TMP_001")
                .qestnrQesitmId("ITEM_001")
                .qustnrIemId("IEM_001")
                .build();

        assertThat(respondInfo.getQestnrQesrspnsId()).isEqualTo("RSP_001");
        
        respondInfo.update("Answer", "Respondent", "Etc");
        assertThat(respondInfo.getRespondAnswerCn()).isEqualTo("Answer");
        assertThat(respondInfo.getRespondNm()).isEqualTo("Respondent");
    }

    @Test
    @DisplayName("SurveyRespondent 테스트")
    void surveyRespondentTest() {
        SurveyRespondent respondent = SurveyRespondent.builder()
                .qestnrRespondId("RES_001")
                .qestnrId("QST_001")
                .respondNm("John Doe")
                .sexdstnCode("M")
                .build();

        assertThat(respondent.getQestnrRespondId()).isEqualTo("RES_001");
        assertThat(respondent.getRespondNm()).isEqualTo("John Doe");

        respondent.update("F", "JOB_01", "Jane Doe", "19900101", "02", "111", "222", "user01");
        assertThat(respondent.getRespondNm()).isEqualTo("Jane Doe");
        assertThat(respondent.getSexdstnCode()).isEqualTo("F");
    }
}
