package com.company.project.api.controller.help;

import com.company.project.service.help.EgovHelpService;
import com.company.project.service.help.dto.AdministrationWordDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("HelpController 단위 테스트")
class HelpControllerTest {

    private MockMvc mockMvc;

    @Mock
    private EgovHelpService helpService;

    @InjectMocks
    private HelpController helpController;

    private ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(helpController)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .build();
    }

    @Test
    @DisplayName("행정 용어 목록 조회 테스트")
    void getWordsTest() throws Exception {
        Page<AdministrationWordDto> page = new PageImpl<>(Collections.emptyList(), PageRequest.of(0, 10), 0);
        when(helpService.getAdministrationWordList(any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/v1/help/words")
                        .param("keyword", "test")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("행정 용어 등록 테스트")
    void insertWordTest() throws Exception {
        AdministrationWordDto dto = AdministrationWordDto.builder()
                .administWordNm("테스트단어")
                .administWordDc("테스트설명")
                .build();
        
        when(helpService.createAdministrationWord(eq("ADMIN"), any(AdministrationWordDto.class)))
                .thenReturn("WORD_001");

        mockMvc.perform(post("/api/v1/help/words")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value("WORD_001"));
    }

    @Test
    @DisplayName("행정 용어 수정 테스트")
    void updateWordTest() throws Exception {
        AdministrationWordDto dto = AdministrationWordDto.builder()
                .administWordNm("수정단어")
                .administWordDc("수정설명")
                .build();

        mockMvc.perform(put("/api/v1/help/words/WORD_001")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("행정 용어 삭제 테스트")
    void deleteWordTest() throws Exception {
        mockMvc.perform(delete("/api/v1/help/words/WORD_001"))
                .andExpect(status().isOk());
    }
}
