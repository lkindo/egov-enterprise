package com.company.project.domain.system.service.qna;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Qna 엔티티 테스트")
class QnaTest {

    @Test
    @DisplayName("Qna 빌더 및 초기화 테스트")
    void builderTest() {
        Qna qna = Qna.builder()
                .qaId("QA_001")
                .qestnSj("Question Title")
                .qestnCn("Question Content")
                .wrterNm("Tester")
                .createdBy("admin")
                .build();

        assertThat(qna.getQaId()).isEqualTo("QA_001");
        assertThat(qna.getQestnSj()).isEqualTo("Question Title");
        assertThat(qna.getWrterNm()).isEqualTo("Tester");
        assertThat(qna.getInqireCo()).isEqualTo(0);
        assertThat(qna.getQnaProcessSttusCode()).isEqualTo("Q");
    }

    @Test
    @DisplayName("질문 수정 테스트")
    void updateQuestionTest() {
        Qna qna = Qna.builder()
                .qaId("QA_001")
                .qestnSj("Old Title")
                .build();

        qna.updateQuestion("New Title", "New Content", "test@test.com", "02", "111", "222");
        qna.setLastModifiedBy("user01");

        assertThat(qna.getQestnSj()).isEqualTo("New Title");
        assertThat(qna.getQestnCn()).isEqualTo("New Content");
        assertThat(qna.getLastModifiedBy()).isEqualTo("user01");
    }

    @Test
    @DisplayName("답변 기능 테스트")
    void answerTest() {
        Qna qna = Qna.builder().build();
        qna.answer("This is an answer");
        qna.setLastModifiedBy("admin2");

        assertThat(qna.getAnswerCn()).isEqualTo("This is an answer");
        assertThat(qna.getQnaProcessSttusCode()).isEqualTo("A");
        assertThat(qna.getAnswerDe()).isNotNull();
        assertThat(qna.getLastModifiedBy()).isEqualTo("admin2");
    }

    @Test
    @DisplayName("조회수 증가 테스트")
    void increaseViewCountTest() {
        Qna qna = Qna.builder().build();
        assertThat(qna.getInqireCo()).isEqualTo(0);
        qna.increaseViewCount();
        assertThat(qna.getInqireCo()).isEqualTo(1);
    }
}
