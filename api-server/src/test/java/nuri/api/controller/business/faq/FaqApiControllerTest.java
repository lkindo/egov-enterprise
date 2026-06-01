package nuri.api.controller.business.faq;

import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.ErrorCode;
import nuri.business.service.faq.FaqService;
import nuri.business.service.faq.dto.FaqDto;
import nuri.business.core.exception.GlobalExceptionHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import nuri.business.support.ControllerTestSupport;

@WebMvcTest(FaqApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
@DisplayName("FaqApiController 테스트")
class FaqApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private FaqService faqService;

    @Test
    @DisplayName("FAQ 목록 조회 성공")
    void getFaqs_Success() throws Exception {
        // Given
        Page<FaqDto> page = new PageImpl<>(List.of(FaqDto.builder().faqId("FAQ1").qstnTtl("Question").build()));
        given(faqService.getFaqList(any(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/faqs")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].faqId").value("FAQ1"));
    }

    @Test
    @DisplayName("FAQ 목록 키워드 조회 성공")
    void getFaqs_WithKeyword_Success() throws Exception {
        // Given
        Page<FaqDto> page = new PageImpl<>(List.of(FaqDto.builder().faqId("FAQ1").qstnTtl("Keyword Question").build()));
        given(faqService.getFaqList(eq("keyword"), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/faqs")
                .param("searchKeyword", "keyword")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].faqId").value("FAQ1"))
                .andExpect(jsonPath("$.data.list[0].qstnTtl").value("Keyword Question"));
    }

    @Test
    @DisplayName("FAQ 상세 조회 성공")
    void getFaq_Success() throws Exception {
        // Given
        given(faqService.getFaq(anyString())).willReturn(FaqDto.builder().faqId("FAQ1").qstnTtl("Question").build());

        // When & Then
        mockMvc.perform(get("/api/v1/faqs/FAQ1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.faqId").value("FAQ1"));
    }

    @Test
    @DisplayName("FAQ 상세 조회 실패 - 존재하지 않는 FAQ")
    void getFaq_NotFound() throws Exception {
        // Given
        given(faqService.getFaq(anyString())).willThrow(new BusinessException(ErrorCode.RESOURCE_NOT_FOUND));

        // When & Then
        mockMvc.perform(get("/api/v1/faqs/NOT_FOUND")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("FAQ 등록 성공")
    void insertFaq_Success() throws Exception {
        // Given
        given(faqService.createFaq(anyString(), any(FaqDto.class))).willReturn("FAQ1");

        // When & Then
        mockMvc.perform(post("/api/v1/faqs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"qstnTtl\":\"Question\",\"qstnCn\":\"Content\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("FAQ1"));
    }

    @Test
    @DisplayName("FAQ 수정 성공")
    void updateFaq_Success() throws Exception {
        // Given
        willDoNothing().given(faqService).updateFaq(anyString(), anyString(), any(FaqDto.class));

        // When & Then
        mockMvc.perform(put("/api/v1/faqs/FAQ1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"qstnTtl\":\"Updated Question\",\"qstnCn\":\"Updated Content\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("FAQ 삭제 성공")
    void deleteFaq_Success() throws Exception {
        // Given
        willDoNothing().given(faqService).deleteFaq(anyString(), anyString());

        // When & Then
        mockMvc.perform(delete("/api/v1/faqs/FAQ1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }
}
