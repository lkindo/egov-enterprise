package com.company.project.api.controller.system.template;

import com.company.project.domain.template.TmplatInfo;
import com.company.project.service.template.TmplatInfoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TemplateApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("TemplateApiController 테스트")
class TemplateApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TmplatInfoService tmplatInfoService;

    @Test
    @DisplayName("템플릿 목록 조회 성공")
    void selectTmplatInfoList_Success() throws Exception {
        // Given
        TmplatInfo info = TmplatInfo.builder().tmplatId("T1").tmplatNm("Template 1").build();
        given(tmplatInfoService.selectTmplatInfoList()).willReturn(List.of(info));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/templates")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].tmplatId").value("T1"));
    }
}
