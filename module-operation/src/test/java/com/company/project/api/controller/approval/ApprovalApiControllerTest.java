package com.company.project.api.controller.approval;

import com.company.project.TestApplication;
import com.company.project.service.informalsanction.InformalSanctionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ApprovalApiController.class)
@ContextConfiguration(classes = TestApplication.class)
@DisplayName("ApprovalApiController 테스트")
class ApprovalApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean(name = "approvalService")
    private InformalSanctionService approvalService;

    @Test
    @DisplayName("대기 중인 결재 목록 조회 테스트")
    @WithMockUser(username = "user01")
    void getPendingApprovalsTest() throws Exception {
        mockMvc.perform(get("/api/v1/approvals/pending"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("나의 결재 이력 조회 테스트")
    @WithMockUser(username = "user01")
    void getMyApprovalHistoryTest() throws Exception {
        mockMvc.perform(get("/api/v1/approvals/my"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("결재 승인/반려 테스트")
    @WithMockUser(username = "user01")
    void confirmApprovalTest() throws Exception {
        Map<String, String> request = Map.of("status", "C", "reason", "Approved");

        mockMvc.perform(put("/api/v1/approvals/IS1/confirm")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }
}
