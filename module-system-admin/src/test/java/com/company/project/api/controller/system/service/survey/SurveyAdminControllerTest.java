package com.company.project.api.controller.system.service.survey;

import com.company.project.service.system.service.survey.EgovSurveyService;
import com.company.project.service.system.service.survey.dto.QestnrInfoDto;
import com.company.project.service.system.service.survey.dto.QestnrTmplatDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(SurveyAdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("SurveyAdminController 테스트")
class SurveyAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EgovSurveyService surveyService;

    @Test
    @DisplayName("설문 정보 목록 조회 성공")
    void getSurveys_Success() throws Exception {
        // Given
        QestnrInfoDto dto = new QestnrInfoDto();
        dto.setQestnrId("S1");
        given(surveyService.getSurveyList(any(), any()))
                .willReturn(new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/surveys")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.resultList[0].qestnrId").value("S1"));
    }

    @Test
    @DisplayName("설문 템플릿 목록 조회 성공")
    void getTemplates_Success() throws Exception {
        // Given
        QestnrTmplatDto dto = new QestnrTmplatDto();
        dto.setQestnrTmplatId("T1");
        given(surveyService.getTmplatList(any(), any()))
                .willReturn(new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/surveys/templates")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.resultList[0].qestnrTmplatId").value("T1"));
    }
}
