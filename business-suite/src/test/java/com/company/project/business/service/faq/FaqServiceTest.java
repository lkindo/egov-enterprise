package com.company.project.business.service.faq;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.business.domain.faq.Faq;
import com.company.project.business.domain.faq.FaqRepository;
import com.company.project.business.service.faq.dto.FaqDto;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("FaqService 테스트")
class FaqServiceTest {

    @Mock
    private FaqRepository faqRepository;

    @InjectMocks
    private FaqService faqService;

    @Test
    @DisplayName("FAQ 목록 조회 성공")
    void getFaqList_Success() {
        // Given
        String keyword = "test";
        Pageable pageable = PageRequest.of(0, 10);
        Faq faq = Faq.builder().faqId("FAQ1").qestnSj("Question").build();
        given(faqRepository.searchFaqs(anyString(), any(Pageable.class))).willReturn(new PageImpl<>(List.of(faq)));

        // When
        Page<FaqDto> result = faqService.getFaqList(keyword, pageable);

        // Then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getFaqId()).isEqualTo("FAQ1");
        verify(faqRepository).searchFaqs(keyword, pageable);
    }

    @Test
    @DisplayName("FAQ 상세 조회 성공")
    void getFaq_Success() {
        // Given
        String faqId = "FAQ1";
        Faq faq = Faq.builder().faqId(faqId).qestnSj("Question").build();
        given(faqRepository.findById(faqId)).willReturn(Optional.of(faq));

        // When
        FaqDto result = faqService.getFaq(faqId);

        // Then
        assertThat(result.getFaqId()).isEqualTo(faqId);
        verify(faqRepository).findById(faqId);
    }

    @Test
    @DisplayName("FAQ 상세 조회 실패 - 존재하지 않는 FAQ")
    void getFaq_NotFound() {
        // Given
        String faqId = "NON_EXISTENT";
        given(faqRepository.findById(faqId)).willReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> faqService.getFaq(faqId))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("FAQ 등록 성공")
    void createFaq_Success() {
        // Given
        String userId = "ADMIN";
        FaqDto dto = FaqDto.builder().qestnSj("New Question").qestnCn("New Content").build();

        // When
        String id = faqService.createFaq(userId, dto);

        // Then
        assertThat(id).startsWith("FAQ_");
        verify(faqRepository, times(1)).save(any(Faq.class));
    }

    @Test
    @DisplayName("FAQ 수정 성공")
    void updateFaq_Success() {
        // Given
        String faqId = "FAQ1";
        String userId = "ADMIN";
        FaqDto dto = FaqDto.builder().qestnSj("Updated Sj").build();
        Faq faq = Faq.builder().faqId(faqId).qestnSj("Old Sj").build();
        given(faqRepository.findById(faqId)).willReturn(Optional.of(faq));

        // When
        faqService.updateFaq(faqId, userId, dto);

        // Then
        assertThat(faq.getQestnSj()).isEqualTo("Updated Sj");
        verify(faqRepository).findById(faqId);
    }

    @Test
    @DisplayName("FAQ 삭제 성공")
    void deleteFaq_Success() {
        // Given
        String faqId = "FAQ1";
        String userId = "ADMIN";

        // When
        faqService.deleteFaq(faqId, userId);

        // Then
        verify(faqRepository, times(1)).deleteById(faqId);
    }

    @Test
    @DisplayName("FAQ 조회수 증가 성공")
    void increaseViewCount_Success() {
        // Given
        String faqId = "FAQ1";
        Faq faq = Faq.builder().faqId(faqId).inqireCo(0).build();
        given(faqRepository.findById(faqId)).willReturn(Optional.of(faq));

        // When
        faqService.increaseViewCount(faqId);

        // Then
        assertThat(faq.getInqireCo()).isEqualTo(1);
        verify(faqRepository).findById(faqId);
    }
}
