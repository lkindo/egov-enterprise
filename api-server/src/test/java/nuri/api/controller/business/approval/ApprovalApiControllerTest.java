package nuri.api.controller.business.approval;

import nuri.business.service.informalsanction.InformalSanctionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import nuri.business.security.annotation.WithMockCustomUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import nuri.business.support.ControllerTestSupport;

import nuri.business.security.service.CustomUserDetails;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;

@WebMvcTest(ApprovalApiController.class)
@DisplayName("ApprovalApiController 테스트")
class ApprovalApiControllerTest extends ControllerTestSupport {

    @MockitoBean(name = "approvalService")
    private InformalSanctionService approvalService;

    private CustomUserDetails mockUser() {
        return CustomUserDetails.builder()
                .esntlId("user01")
                .userId("user01")
                .authorCode("ROLE_USER")
                .build();
    }

    @Test
    @DisplayName("대기 중인 결재 목록 조회 테스트")
    void getPendingApprovalsTest() throws Exception {
        org.mockito.BDDMockito.given(approvalService.getReceivedInformalSanctionList(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any())).willReturn(new org.springframework.data.domain.PageImpl<>(java.util.Collections.emptyList()));

        mockMvc.perform(get("/api/v1/approvals/pending")
                        .with(user(mockUser())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("나의 결재 이력 조회 테스트")
    void getMyApprovalHistoryTest() throws Exception {
        org.mockito.BDDMockito.given(approvalService.getInformalSanctionList(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any())).willReturn(new org.springframework.data.domain.PageImpl<>(java.util.Collections.emptyList()));

        mockMvc.perform(get("/api/v1/approvals/my")
                        .with(user(mockUser())))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("결재 승인/반려 테스트")
    void confirmApprovalTest() throws Exception {
        Map<String, String> request = Map.of("status", "C", "reason", "Approved");

        mockMvc.perform(put("/api/v1/approvals/IS1/confirm")
                        .with(csrf())
                        .with(user(mockUser()))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }
}
