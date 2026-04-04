package com.company.project.business.service.faq;

import com.company.project.business.domain.faq.Faq;
import com.company.project.business.domain.faq.FaqRepository;
import com.company.project.business.service.faq.dto.FaqDto;
import com.company.project.foundation.core.exception.BusinessException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
@DisplayName("FaqService 단위 테스트")
class FaqServiceTest {

    @InjectMocks
    private FaqService faqService;

    @Mock
    private FaqRepository faqRepository;

    @Test
    @DisplayName("FAQ 목록 조회 - 성공")
    void getFaqList_Success() {
        // given
        String keyword = "test";
        Pageable pageable = PageRequest.of(0, 10);
        Faq faq = Faq.builder()
                .faqId("FAQ_1")
                .qestnSj("Question 1")
                .qestnCn("Content 1")
                .answerCn("Answer 1")
                .build();
        Page<Faq> faqPage = new PageImpl<>(List.of(faq));

        given(faqRepository.searchFaqs(eq(keyword), eq(pageable))).willReturn(faqPage);

        // when
        Page<FaqDto> result = faqService.getFaqList(keyword, pageable);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getFaqId()).isEqualTo("FAQ_1");
    }

    @Test
    @DisplayName("FAQ 단건 조회 - 성공")
    void getFaq_Success() {
        // given
        String faqId = "FAQ_1";
        Faq faq = Faq.builder()
                .faqId(faqId)
                .qestnSj("Question 1")
                .qestnCn("Content 1")
                .answerCn("Answer 1")
                .build();

        given(faqRepository.findById(faqId)).willReturn(Optional.of(faq));

        // when
        FaqDto result = faqService.getFaq(faqId);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getFaqId()).isEqualTo(faqId);
        assertThat(result.getQestnSj()).isEqualTo("Question 1");
    }

    @Test
    @DisplayName("FAQ 단건 조회 - 실패 (존재하지 않음)")
    void getFaq_Fail_NotFound() {
        // given
        String faqId = "FAQ_999";
        given(faqRepository.findById(faqId)).willReturn(Optional.empty());

        // when & then
        assertThrows(BusinessException.class, () -> faqService.getFaq(faqId));
    }

    @Test
    @DisplayName("FAQ 생성 - 성공")
    void createFaq_Success() {
        // given
        String userId = "user1";
        FaqDto dto = FaqDto.builder()
                .qestnSj("New Question")
                .qestnCn("New Content")
                .answerCn("New Answer")
                .build();

        given(faqRepository.save(any(Faq.class))).willAnswer(invocation -> invocation.getArgument(0));

        // when
        String createdFaqId = faqService.createFaq(userId, dto);

        // then
        assertThat(createdFaqId).isNotNull();
        assertThat(createdFaqId).startsWith("FAQ_");
        verify(faqRepository, times(1)).save(any(Faq.class));
    }

    @Test
    @DisplayName("FAQ 수정 - 성공")
    void updateFaq_Success() {
        // given
        String faqId = "FAQ_1";
        String userId = "user1";
        FaqDto dto = FaqDto.builder()
                .qestnSj("Updated Question")
                .qestnCn("Updated Content")
                .answerCn("Updated Answer")
                .build();

        Faq existingFaq = Faq.builder()
                .faqId(faqId)
                .qestnSj("Old Question")
                .qestnCn("Old Content")
                .answerCn("Old Answer")
                .build();

        given(faqRepository.findById(faqId)).willReturn(Optional.of(existingFaq));

        // when
        faqService.updateFaq(faqId, userId, dto);

        // then
        assertThat(existingFaq.getQestnSj()).isEqualTo("Updated Question");
        assertThat(existingFaq.getQestnCn()).isEqualTo("Updated Content");
        assertThat(existingFaq.getAnswerCn()).isEqualTo("Updated Answer");
    }

    @Test
    @DisplayName("FAQ 삭제 - 성공")
    void deleteFaq_Success() {
        // given
        String faqId = "FAQ_1";
        String userId = "user1";

        // when
        faqService.deleteFaq(faqId, userId);

        // then
        verify(faqRepository, times(1)).deleteById(faqId);
    }

    @Test
    @DisplayName("FAQ 조회수 증가 - 성공")
    void increaseViewCount_Success() {
        // given
        String faqId = "FAQ_1";
        Faq faq = Faq.builder()
                .faqId(faqId)
                .inqireCo(0)
                .build();

        given(faqRepository.findById(faqId)).willReturn(Optional.of(faq));

        // when
        faqService.increaseViewCount(faqId);

        // then
        assertThat(faq.getInqireCo()).isEqualTo(1);
    }
}
