package nuri.business.service.faq;

import nuri.business.domain.faq.Faq;
import nuri.business.domain.faq.FaqRepository;
import nuri.business.service.faq.dto.FaqDto;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@DisplayName("FaqService 단위 테스트")
class FaqServiceTest {

    @Mock
    private FaqRepository faqRepository;

    @InjectMocks
    private FaqService faqService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    @DisplayName("FAQ 목록 조회")
    void getFaqList() {
        // given
        Pageable pageable = PageRequest.of(0, 10);
        Faq entity = Faq.builder().faqId("FAQ1").qstnTtl("Question 1").build();
        given(faqRepository.searchFaqs(anyString(), any())).willReturn(new PageImpl<>(List.of(entity)));

        // when
        Page<FaqDto> result = faqService.getFaqList("test", pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
    }

    @Test
    @DisplayName("FAQ 상세 조회")
    void getFaq() {
        // given
        String faqId = "FAQ1";
        Faq entity = Faq.builder().faqId(faqId).qstnTtl("Question 1").build();
        given(faqRepository.findById(faqId)).willReturn(Optional.of(entity));

        // when
        FaqDto result = faqService.getFaq(faqId);

        // then
        assertThat(result).isNotNull();
        assertThat(result.getFaqId()).isEqualTo(faqId);
    }

    @Test
    @DisplayName("FAQ 생성")
    void createFaq() {
        // given
        String userId = "user1";
        FaqDto dto = FaqDto.builder()
                .faqId("FAQ1")
                .qstnTtl("New Question")
                .qstnCn("Content")
                .build();

        // when
        String id = faqService.createFaq(userId, dto);

        // then
        assertThat(id).isEqualTo("FAQ1");
        verify(faqRepository).save(any(Faq.class));
    }

    @Test
    @DisplayName("FAQ 수정")
    void updateFaq() {
        // given
        String faqId = "FAQ1";
        String userId = "user1";
        Faq existingFaq = Faq.builder().faqId(faqId).qstnTtl("Old Question").build();
        FaqDto updateDto = FaqDto.builder()
                .faqId(faqId)
                .qstnTtl("Updated Question")
                .qstnCn("Updated Content")
                .build();

        given(faqRepository.findById(faqId)).willReturn(Optional.of(existingFaq));

        // when
        faqService.updateFaq(faqId, userId, updateDto);

        // then
        assertThat(existingFaq.getQstnTtl()).isEqualTo("Updated Question");
        assertThat(existingFaq.getQstnCn()).isEqualTo("Updated Content");
    }

    @Test
    @DisplayName("FAQ 삭제")
    void deleteFaq() {
        // given
        String faqId = "FAQ1";
        String userId = "user1";

        // when
        faqService.deleteFaq(faqId, userId);

        // then
        verify(faqRepository).deleteById(faqId);
    }

    @Test
    @DisplayName("FAQ 조회수 증가")
    void increaseInqCnt() {
        // given
        String faqId = "FAQ1";
        Faq entity = org.mockito.Mockito.spy(Faq.builder().faqId(faqId).inqCnt(0).build());
        given(faqRepository.findById(faqId)).willReturn(Optional.of(entity));

        // when
        faqService.increaseInqCnt(faqId);

        // then
        verify(entity).increaseInqCnt();
    }
}
