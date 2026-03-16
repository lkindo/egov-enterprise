package com.company.project.api.controller.system;

import com.company.project.service.usermanagement.EgovDeptManageService;
import com.company.project.service.usermanagement.dto.DeptManageDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DeptApiController.class)
@WithMockUser(roles = "ADMIN")
class DeptApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EgovDeptManageService deptManageService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("부서 목록 조회 테스트")
    void getDeptsTest() throws Exception {
        DeptManageDto dto = DeptManageDto.builder()
                .orgnztId("ORGNZT_X")
                .orgnztNm("테스트부서")
                .build();
        Page<DeptManageDto> page = new PageImpl<>(Collections.singletonList(dto), PageRequest.of(0, 10), 1);

        given(deptManageService.getDeptManageList(anyString(), any())).willReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/depts")
                        .param("keyword", "테스트")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.resultList[0].orgnztId").value("ORGNZT_X"));
    }

    @Test
    @DisplayName("부서 상세 조회 테스트")
    void getDeptTest() throws Exception {
        DeptManageDto dto = DeptManageDto.builder()
                .orgnztId("ORGNZT_X")
                .orgnztNm("테스트부서")
                .build();

        given(deptManageService.getDeptManage("ORGNZT_X")).willReturn(dto);

        mockMvc.perform(get("/api/v1/admin/system/depts/ORGNZT_X"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orgnztNm").value("테스트부서"));
    }

    @Test
    @DisplayName("부서 등록 테스트")
    void insertDeptTest() throws Exception {
        DeptManageDto dto = DeptManageDto.builder()
                .orgnztId("ORGNZT_NEW")
                .orgnztNm("신규부서")
                .build();

        mockMvc.perform(post("/api/v1/admin/system/depts")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(deptManageService).insertDeptManage(any());
    }

    @Test
    @DisplayName("부서 정보 수정 테스트")
    void updateDeptTest() throws Exception {
        DeptManageDto dto = DeptManageDto.builder()
                .orgnztNm("수정부서")
                .build();

        mockMvc.perform(put("/api/v1/admin/system/depts/ORGNZT_X")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());

        verify(deptManageService).updateDeptManage(any());
    }

    @Test
    @DisplayName("부서 삭제 테스트")
    void deleteDeptTest() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/system/depts/ORGNZT_X")
                        .with(csrf()))
                .andExpect(status().isOk());

        verify(deptManageService).deleteDeptManage("ORGNZT_X");
    }
}
