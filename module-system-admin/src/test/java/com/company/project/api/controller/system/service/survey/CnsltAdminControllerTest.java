package com.company.project.api.controller.system.service.survey;

import com.company.project.service.system.service.consult.EgovCnsltService;
import com.company.project.service.system.service.consult.dto.CnsltManageDto;
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

@WebMvcTest(CnsltAdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("CnsltAdminController 테스트")
class CnsltAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EgovCnsltService cnsltService;

    @Test
    @DisplayName("상담 목록 조회 성공")
    void getConsultations_Success() throws Exception {
        // Given
        CnsltManageDto dto = new CnsltManageDto();
        dto.setCnsltId("C1");
        given(cnsltService.getCnsltList(any(), any()))
                .willReturn(new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1));

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/consultations")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.resultList[0].cnsltId").value("C1"));
    }
}
