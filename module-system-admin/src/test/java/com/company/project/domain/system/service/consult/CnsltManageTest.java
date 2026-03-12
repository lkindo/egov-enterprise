package com.company.project.domain.system.service.consult;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("CnsltManage 엔티티 테스트")
class CnsltManageTest {

    @Test
    @DisplayName("CnsltManage 빌더 및 초기화 테스트")
    void builderTest() {
        CnsltManage cnslt = CnsltManage.builder()
                .cnsltId("CNSLT_001")
                .cnsltSj("Consultation Subject")
                .cnsltCn("Description")
                .othbcAt("Y")
                .wrterNm("Tester")
                .frstRegisterId("admin")
                .build();

        assertThat(cnslt.getCnsltId()).isEqualTo("CNSLT_001");
        assertThat(cnslt.getCnsltSj()).isEqualTo("Consultation Subject");
        assertThat(cnslt.getWrterNm()).isEqualTo("Tester");
        assertThat(cnslt.getInqireCo()).isEqualTo(0);
        assertThat(cnslt.getQnaProcessSttusCode()).isEqualTo("1");
    }

    @Test
    @DisplayName("CnsltManage 수정 테스트")
    void updateTest() {
        CnsltManage cnslt = CnsltManage.builder()
                .cnsltId("CNSLT_001")
                .cnsltSj("Old Subject")
                .build();

        cnslt.update("New Subject", "New Cn", "N", "pwd", "02", "111", "222", "010", "333", "444", "test@test.com", "Y", "Mod Writer", "FILE_001", "user01");

        assertThat(cnslt.getCnsltSj()).isEqualTo("New Subject");
        assertThat(cnslt.getOthbcAt()).isEqualTo("N");
        assertThat(cnslt.getLastUpdusrId()).isEqualTo("user01");
        assertThat(cnslt.getLastUpdusrPnttm()).isNotNull();
    }

    @Test
    @DisplayName("조회수 증가 테스트")
    void incrementInqireCoTest() {
        CnsltManage cnslt = CnsltManage.builder().build();
        assertThat(cnslt.getInqireCo()).isEqualTo(0);
        cnslt.incrementInqireCo();
        assertThat(cnslt.getInqireCo()).isEqualTo(1);
    }

    @Test
    @DisplayName("답변 업데이트 테스트")
    void updateAnswerTest() {
        CnsltManage cnslt = CnsltManage.builder().build();
        cnslt.updateAnswer("3", "Answer Content", "admin2");

        assertThat(cnslt.getQnaProcessSttusCode()).isEqualTo("3");
        assertThat(cnslt.getManagtCn()).isEqualTo("Answer Content");
        assertThat(cnslt.getLastUpdusrId()).isEqualTo("admin2");
        assertThat(cnslt.getManagtDe()).isNotNull();
    }
}
