package com.company.project.api.controller.system.code;

import com.company.project.service.code.CommonCodeService;
import com.company.project.service.code.dto.CmmnClCodeDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.egovframe.rte.fdl.property.EgovPropertyService;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CodeAdminController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("CodeAdminController 테스트")
class CodeAdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CommonCodeService commonCodeService;

    @MockitoBean
    private EgovPropertyService propertiesService;

    @Test
    @DisplayName("분류코드 목록 조회 성공")
    void getClCodeList_Success() throws Exception {
        // Given
        CmmnClCodeDto dto = new CmmnClCodeDto();
        dto.setClCode("CL1");
        given(commonCodeService.selectCmmnClCodeList(any())).willReturn(List.of(dto));
        given(commonCodeService.selectCmmnClCodeListTotCnt(any())).willReturn(1);
        given(propertiesService.getInt(anyString())).willReturn(10);

        // When & Then
        mockMvc.perform(get("/api/v1/admin/system/codes/cl")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.resultList[0].clCode").value("CL1"));
    }
}
