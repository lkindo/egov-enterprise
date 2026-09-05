package nuri.api.controller.business.approval;

import nuri.business.security.annotation.WithMockCustomUser;
import nuri.business.service.informalsanction.InformalSanctionService;
import nuri.business.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ApprovalApiController.class)
@DisplayName("ApprovalApiController 입력 계약")
class ApprovalApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private InformalSanctionService approvalService;

    @Test
    @WithMockCustomUser
    @DisplayName("승인은 C 상태 코드로 요청할 수 있다")
    void confirmsApprovalWithTypedStatus() throws Exception {
        mockMvc.perform(put("/api/v1/approvals/7/confirm")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"C"}
                                """))
                .andExpect(status().isOk());

        verify(approvalService).confirmInformalSanction(7L, "C", null);
    }

    @Test
    @WithMockCustomUser
    @DisplayName("상태 코드가 없거나 승인·반려 코드가 아니면 서비스 전에 400")
    void rejectsMissingOrUnknownStatus() throws Exception {
        for (String body : new String[]{"{}", "{\"status\":\"A\"}", "{\"status\":\"UNKNOWN\"}"}) {
            mockMvc.perform(put("/api/v1/approvals/7/confirm")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        verifyNoInteractions(approvalService);
    }

    @Test
    @WithMockCustomUser
    @DisplayName("반려는 공백이 아닌 사유가 필수다")
    void rejectsBlankRejectionReason() throws Exception {
        mockMvc.perform(put("/api/v1/approvals/7/confirm")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"R","reason":"   "}
                                """))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(approvalService);
    }

    /**
     * [2026-09-05] 종전에는 '처리 이력' 이 {@code /my}(신청자 기준)를 불렀다. 결재자가 처리한 건은
     * 별도 경로이며 신청자 조회를 부르지 않아야 한다.
     */
    @Test
    @WithMockCustomUser(username = "approver", esntlId = "APPROVER_ESNTL")
    @DisplayName("처리한 결재 목록은 결재자 본인의 esntlId 로 processed 조회를 부른다")
    void listsProcessedApprovalsForCurrentApprover() throws Exception {
        org.mockito.BDDMockito.given(approvalService.getProcessedApprovalList(
                        org.mockito.ArgumentMatchers.eq("APPROVER_ESNTL"), org.mockito.ArgumentMatchers.any()))
                .willReturn(new org.springframework.data.domain.PageImpl<>(java.util.List.of()));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/approvals/processed"))
                .andExpect(status().isOk());

        verify(approvalService).getProcessedApprovalList(
                org.mockito.ArgumentMatchers.eq("APPROVER_ESNTL"), org.mockito.ArgumentMatchers.any());
        org.mockito.Mockito.verify(approvalService, org.mockito.Mockito.never())
                .getInformalSanctionList(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    @WithMockCustomUser
    @DisplayName("업무 구분 선택지는 인증 사용자에게 COM075 상세코드를 그대로 내려준다")
    void listsTaskTypesForAuthenticatedUser() throws Exception {
        org.mockito.BDDMockito.given(approvalService.getTaskTypes()).willReturn(java.util.List.of(
                new nuri.business.service.code.dto.CommonCodeDto("COM075", "01", "일반", null, "Y")));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/approvals/task-types"))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .jsonPath("$.data[0].dtlCd").value("01"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .jsonPath("$.data[0].dtlCdNm").value("일반"));
    }

    /**
     * [2026-09-05] 기안은 신청자를 본문이 아니라 인증 주체에서 정한다. 클라이언트가 aplcntId 를 보내도
     * 무시되며, 신청일이 비면 서버가 채운다.
     */
    @Test
    @WithMockCustomUser(username = "drafter", esntlId = "DRAFTER_ESNTL")
    @DisplayName("기안은 현재 사용자를 신청자로 고정하고 빈 신청일은 서버가 8자리로 채운다")
    void createsDraftBoundToCurrentUser() throws Exception {
        org.mockito.BDDMockito.given(approvalService.registerInformalSanction(org.mockito.ArgumentMatchers.any()))
                .willReturn(42L);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"taskSeCd":"01","aprvrId":"BOSS_ESNTL"}
                                """))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .jsonPath("$.data").value(42));

        org.mockito.ArgumentCaptor<nuri.business.service.informalsanction.dto.InformalSanctionDto> captor =
                org.mockito.ArgumentCaptor.forClass(nuri.business.service.informalsanction.dto.InformalSanctionDto.class);
        verify(approvalService).registerInformalSanction(captor.capture());
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getAplcntId()).isEqualTo("DRAFTER_ESNTL");
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getAprvrId()).isEqualTo("BOSS_ESNTL");
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getTaskSeCd()).isEqualTo("01");
        org.assertj.core.api.Assertions.assertThat(captor.getValue().getReqYmd()).matches("^\\d{8}$");
    }

    @Test
    @WithMockCustomUser
    @DisplayName("기안은 업무 구분·결재자가 비거나 신청일 형식이 틀리면 서비스 전에 400")
    void rejectsInvalidDraft() throws Exception {
        for (String body : new String[]{
                "{}",
                "{\"taskSeCd\":\"01\"}",
                "{\"aprvrId\":\"BOSS\"}",
                "{\"taskSeCd\":\"\",\"aprvrId\":\"BOSS\"}",
                "{\"taskSeCd\":\"01\",\"aprvrId\":\"BOSS\",\"reqYmd\":\"2026-09-05\"}",
                "{\"taskSeCd\":\"1234567890123\",\"aprvrId\":\"BOSS\"}"}) {
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        verifyNoInteractions(approvalService);
    }

    @Test
    @WithMockCustomUser
    @DisplayName("반려 사유는 물리 컬럼 길이 4000자를 넘을 수 없다")
    void rejectsOversizedRejectionReason() throws Exception {
        String reason = "가".repeat(4001);

        mockMvc.perform(put("/api/v1/approvals/7/confirm")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                java.util.Map.of("status", "R", "reason", reason))))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(approvalService);
    }
}
