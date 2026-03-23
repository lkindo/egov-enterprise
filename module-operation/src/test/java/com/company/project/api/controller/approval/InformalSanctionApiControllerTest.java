package com.company.project.api.controller.approval;

import com.company.project.TestApplication;
import com.company.project.service.informalsanction.InformalSanctionService;
import com.company.project.service.informalsanction.dto.InformalSanctionDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;


import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(InformalSanctionApiController.class)
@ContextConfiguration(classes = TestApplication.class)
@DisplayName("InformalSanctionApiController 테스트")
class InformalSanctionApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean(name = "informalSanctionService")
    private InformalSanctionService informalSanctionService;

    @MockitoBean(name = "egovInfrmlSanctnIdGnrService")
    private EgovIdGnrService egovInfrmlSanctnIdGnrService;

    @Test
    @DisplayName("비정형 결재 목록 조회 테스트")
    @WithMockUser(username = "user01")
    void getInformalSanctionListTest() throws Exception {
        org.mockito.BDDMockito.given(informalSanctionService.getInformalSanctionList(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any())).willReturn(new org.springframework.data.domain.PageImpl<>(java.util.Collections.emptyList()));
        mockMvc.perform(get("/api/v1/informal-sanctions"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("수신된 비정형 결재 목록 조회 테스트")
    @WithMockUser(username = "user01")
    void getReceivedInformalSanctionListTest() throws Exception {
        org.mockito.BDDMockito.given(informalSanctionService.getReceivedInformalSanctionList(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any())).willReturn(new org.springframework.data.domain.PageImpl<>(java.util.Collections.emptyList()));
        mockMvc.perform(get("/api/v1/informal-sanctions").param("type", "received"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("비정형 결재 상세 조회 테스트")
    @WithMockUser(username = "user01")
    void getInformalSanctionTest() throws Exception {
        mockMvc.perform(get("/api/v1/informal-sanctions/IS1"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("비정형 결재 등록 테스트")
    @WithMockUser(username = "user01")
    void registerInformalSanctionTest() throws Exception {
        given(egovInfrmlSanctnIdGnrService.getNextStringId()).willReturn("IS1");
        
        InformalSanctionDto dto = InformalSanctionDto.builder()
                .jobSeCode("001")
                .sanctionerId("boss01")
                .build();

        mockMvc.perform(post("/api/v1/informal-sanctions")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("비정형 결재 수정 테스트")
    @WithMockUser(username = "user01")
    void updateInformalSanctionTest() throws Exception {
        InformalSanctionDto dto = InformalSanctionDto.builder()
                .jobSeCode("001")
                .build();

        mockMvc.perform(put("/api/v1/informal-sanctions/IS1")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("비정형 결재 승인/반려 테스트")
    @WithMockUser(username = "user01")
    void confirmInformalSanctionTest() throws Exception {
        mockMvc.perform(patch("/api/v1/informal-sanctions/IS1/confirm")
                        .with(csrf())
                        .param("confmAt", "C")
                        .param("returnResn", ""))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("비정형 결재 삭제 테스트")
    @WithMockUser(username = "user01")
    void deleteInformalSanctionTest() throws Exception {
        mockMvc.perform(delete("/api/v1/informal-sanctions/IS1")
                        .with(csrf()))
                .andExpect(status().isOk());
    }
}
