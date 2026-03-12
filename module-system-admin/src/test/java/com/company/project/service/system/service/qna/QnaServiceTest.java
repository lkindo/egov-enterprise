package com.company.project.service.system.service.qna;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.system.service.qna.Qna;
import com.company.project.domain.system.service.qna.QnaRepository;
import com.company.project.service.system.service.qna.dto.QnaDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("QnaService 테스트")
class QnaServiceTest {

    @Mock
    private QnaRepository qnaRepository;

    @InjectMocks
    private QnaService qnaService;

    @Test
    @DisplayName("Q&A 목록 조회 성공")
    void getQnaList_Success() {
        // Given
        Qna qna = Qna.builder().qaId("QNA_1").qestnSj("Subject").build();
        Page<Qna> page = new PageImpl<>(List.of(qna));
        given(qnaRepository.searchQnas(anyString(), any(Pageable.class))).willReturn(page);

        // When
        Page<QnaDto> result = qnaService.getQnaList("Keyword", Pageable.unpaged());

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getQaId()).isEqualTo("QNA_1");
    }

    @Test
    @DisplayName("Q&A 상세 조회 성공")
    void getQna_Success() {
        Qna qna = Qna.builder().qaId("QNA_1").build();
        given(qnaRepository.findById("QNA_1")).willReturn(Optional.of(qna));

        QnaDto result = qnaService.getQna("QNA_1");
        assertThat(result.getQaId()).isEqualTo("QNA_1");
    }

    @Test
    @DisplayName("Q&A 상세 조회 실패 - 존재하지 않음")
    void getQna_NotFound() {
        given(qnaRepository.findById(anyString())).willReturn(Optional.empty());
        assertThatThrownBy(() -> qnaService.getQna("QNA_1"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("Q&A 등록 성공")
    void createQna_Success() {
        QnaDto dto = QnaDto.builder()
                .qestnSj("Subject")
                .qestnCn("Content")
                .wrterNm("Writer")
                .writngPassword("pass")
                .build();

        String id = qnaService.createQna("user1", dto);
        
        assertThat(id).startsWith("QNA_");
        verify(qnaRepository).save(any(Qna.class));
    }

    @Test
    @DisplayName("Q&A 수정 성공")
    void updateQna_Success() {
        Qna qna = Qna.builder().qaId("QNA_1").qestnSj("Old").build();
        given(qnaRepository.findById("QNA_1")).willReturn(Optional.of(qna));

        QnaDto dto = QnaDto.builder().qestnSj("New Subject").build();
        qnaService.updateQna("QNA_1", "user1", dto);
        
        assertThat(qna.getQestnSj()).isEqualTo("New Subject");
    }

    @Test
    @DisplayName("Q&A 삭제 성공")
    void deleteQna_Success() {
        qnaService.deleteQna("QNA_1", "user1");
        verify(qnaRepository).deleteById("QNA_1");
    }

    @Test
    @DisplayName("Q&A 답변 등록 성공")
    void updateAnswer_Success() {
        Qna qna = Qna.builder().qaId("QNA_1").build();
        given(qnaRepository.findById("QNA_1")).willReturn(Optional.of(qna));

        qnaService.updateAnswer("QNA_1", "admin", "Answer Content");
        
        assertThat(qna.getAnswerCn()).isEqualTo("Answer Content");
        assertThat(qna.getQnaProcessSttusCode()).isEqualTo("A");
    }

    @Test
    @DisplayName("조회수 증가 테스트")
    void increaseViewCount_Success() {
        Qna qna = Qna.builder().qaId("QNA_1").inqireCo(10).build();
        given(qnaRepository.findById("QNA_1")).willReturn(Optional.of(qna));

        qnaService.increaseViewCount("QNA_1");
        
        assertThat(qna.getInqireCo()).isEqualTo(11);
    }

    @Test
    @DisplayName("비밀번호 체크 테스트")
    void checkPassword_SuccessFail() {
        Qna qna = Qna.builder().qaId("QNA_1").writngPassword("1234").build();
        given(qnaRepository.findById("QNA_1")).willReturn(Optional.of(qna));

        assertThat(qnaService.checkPassword("QNA_1", "1234")).isTrue();
        assertThat(qnaService.checkPassword("QNA_1", "wrong")).isFalse();
        
        given(qnaRepository.findById("NONE")).willReturn(Optional.empty());
        assertThat(qnaService.checkPassword("NONE", "1234")).isFalse();
    }
}
