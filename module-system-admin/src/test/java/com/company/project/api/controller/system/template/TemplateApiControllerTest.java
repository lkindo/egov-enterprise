package com.company.project.api.controller.system.template;

import com.company.project.domain.template.TmplatInfo;
import com.company.project.service.template.TmplatInfoService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("TemplateApiController 단위 테스트")
class TemplateApiControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private TmplatInfoService tmplatInfoService;

    @InjectMocks
    private TemplateApiController templateApiController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(templateApiController).build();
    }

    @Test
    @DisplayName("템플릿 정보 목록 조회 테스트")
    void getTmplatInfosTest() throws Exception {
        when(tmplatInfoService.selectTmplatInfoList()).thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/admin/system/templates"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("템플릿 정보 상세 조회 테스트")
    void getTmplatInfoTest() throws Exception {
        String tmplatId = "TMPLT_001";
        TmplatInfo info = TmplatInfo.builder().tmplatId(tmplatId).tmplatNm("Test Template").build();
        when(tmplatInfoService.selectTmplatInfoDetail(tmplatId)).thenReturn(info);

        mockMvc.perform(get("/api/v1/admin/system/templates/{tmplatId}", tmplatId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.tmplatId").value(tmplatId));
    }

    @Test
    @DisplayName("템플릿 정보 등록 테스트")
    void insertTmplatInfoTest() throws Exception {
        TmplatInfo info = TmplatInfo.builder().tmplatNm("New Template").tmplatCours("/test").build();

        mockMvc.perform(post("/api/v1/admin/system/templates")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(info)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }
}
