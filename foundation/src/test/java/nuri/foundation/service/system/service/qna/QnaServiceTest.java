package nuri.foundation.service.system.service.qna;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.domain.system.service.qna.Qna;
import nuri.foundation.domain.system.service.qna.QnaRepository;
import nuri.foundation.service.system.service.qna.dto.QnaDto;
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
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("QnaService 단위 테스트")
class QnaServiceTest {

    @InjectMocks
    private QnaService qnaService;

    @Mock
    private QnaRepository qnaRepository;

    @Test
    @DisplayName("QNA 목록 조회 성공")
    void getQnaList_Success() {
        // given
        Page<Qna> page = new PageImpl<>(List.of(Qna.builder().qaId("QNA_01").build()));
        given(qnaRepository.searchQnas(anyString(), any(Pageable.class))).willReturn(page);

        // when
        Page<QnaDto> result = qnaService.getQnaList("keyword", Pageable.unpaged());

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("QNA 상세 조회 성공")
    void getQna_Success() {
        // given
        Qna qna = Qna.builder().qaId("QNA_01").qestnSj("Subject").build();
        given(qnaRepository.findById("QNA_01")).willReturn(Optional.of(qna));

        // when
        QnaDto result = qnaService.getQna("QNA_01");

        // then
        assertThat(result.getQestnSj()).isEqualTo("Subject");
    }

    @Test
    @DisplayName("QNA 상세 조회 실패 - 존재하지 않음")
    void getQna_NotFound() {
        // given
        given(qnaRepository.findById("QNA_01")).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> qnaService.getQna("QNA_01"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("QNA 생성 성공")
    void createQna_Success() {
        // given
        QnaDto dto = QnaDto.builder().qestnSj("Subject").build();

        // when
        String id = qnaService.createQna("user1", dto);

        // then
        assertThat(id).startsWith("QNA_");
        verify(qnaRepository).save(any());
    }

    @Test
    @DisplayName("QNA 삭제 성공")
    void deleteQna_Success() {
        // when
        qnaService.deleteQna("QNA_01", "user1");

        // then
        verify(qnaRepository).deleteById("QNA_01");
    }

    @Test
    @DisplayName("답변 등록 성공")
    void updateAnswer_Success() {
        // given
        Qna qna = Qna.builder().qaId("QNA_01").build();
        given(qnaRepository.findById("QNA_01")).willReturn(Optional.of(qna));

        // when
        qnaService.updateAnswer("QNA_01", "user1", "Answer");

        // then
        assertThat(qna.getAnswerCn()).isEqualTo("Answer");
    }
}
