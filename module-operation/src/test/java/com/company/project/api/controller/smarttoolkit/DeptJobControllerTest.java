package com.company.project.api.controller.smarttoolkit;

import com.company.project.service.deptjob.EgovDeptJobBoxService;
import com.company.project.service.deptjob.dto.DeptJobBoxDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DeptJobController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("DeptJobController 테스트")
class DeptJobControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EgovDeptJobBoxService egovDeptJobBoxService;

    @Test
    @DisplayName("부서 업무함 목록 조회 성공")
    void getDeptJobBoxList_Success() throws Exception {
        // Given
        Page<DeptJobBoxDto> page = new PageImpl<>(List.of(DeptJobBoxDto.builder().deptJobbxId("BOX1").build()));
        given(egovDeptJobBoxService.getDeptJobBoxList(anyString(), any(PageRequest.class))).willReturn(page);

        // When & Then
        mockMvc.perform(get("/api/v1/deptjob/boxes")
                .param("searchWrd", "")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resultList[0].deptJobbxId").value("BOX1"));
    }

    @Test
    @DisplayName("부서 업무함 상세 조회 성공")
    void getDeptJobBox_Success() throws Exception {
        // Given
        given(egovDeptJobBoxService.getDeptJobBox("BOX1")).willReturn(DeptJobBoxDto.builder().deptJobbxId("BOX1").build());

        // When & Then
        mockMvc.perform(get("/api/v1/deptjob/boxes/BOX1")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deptJobBox.deptJobbxId").value("BOX1"));
    }
}
