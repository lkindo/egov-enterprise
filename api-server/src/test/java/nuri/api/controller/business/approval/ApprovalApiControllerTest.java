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
