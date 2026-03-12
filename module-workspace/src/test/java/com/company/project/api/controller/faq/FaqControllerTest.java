package com.company.project.api.controller.faq;

import com.company.project.service.faq.FaqService;
import com.company.project.service.faq.dto.FaqDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FaqController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("FaqController 테스트")
class FaqControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private FaqService faqService;

    @Test
    @DisplayName("FAQ 목록 조회 성공")
    void getFaqs_Success() throws Exception {
        // Given
        Page<FaqDto> page = new PageImpl<>(List.of(FaqDto.builder().faqId("FAQ1").qestnSj("Question").build()));
        given(faqService.getFaqList(any(), any(Pageable.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/faqs")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultList[0].faqId").value("FAQ1"));
    }

    @Test
    @DisplayName("FAQ 상세 조회 성공")
    void getFaq_Success() throws Exception {
        // Given
        given(faqService.getFaq(anyString())).willReturn(FaqDto.builder().faqId("FAQ1").qestnSj("Question").build());

        // When & Then
        mockMvc.perform(get("/api/v1/faqs/FAQ1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.faqId").value("FAQ1"));
    }

    @Test
    @DisplayName("FAQ 등록 성공")
    void insertFaq_Success() throws Exception {
        // Given
        given(faqService.createFaq(anyString(), any(FaqDto.class))).willReturn("FAQ1");

        // When & Then
        mockMvc.perform(post("/api/v1/faqs")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"qestnSj\":\"Question\",\"qestnCn\":\"Content\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("FAQ1"));
    }
}
