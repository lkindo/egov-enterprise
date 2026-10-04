package nuri.api.controller.business.approval;

import nuri.business.security.annotation.WithMockCustomUser;
import nuri.business.service.informalsanction.InformalSanctionService;
import nuri.business.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
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

    @MockitoBean
    private nuri.business.service.informalsanction.ApprovalLineAssistService lineAssistService;

    @MockitoBean
    private nuri.business.service.informalsanction.ApprovalTemporaryDraftService temporaryDraftService;

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

        verify(approvalService).confirmInformalSanction(7L, "C", null, null);
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
                        org.mockito.ArgumentMatchers.eq("APPROVER_ESNTL"), org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any()))
                .willReturn(new org.springframework.data.domain.PageImpl<>(java.util.List.of()));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/approvals/processed"))
                .andExpect(status().isOk());

        verify(approvalService).getProcessedApprovalList(
                org.mockito.ArgumentMatchers.eq("APPROVER_ESNTL"),
                org.mockito.ArgumentMatchers.eq(nuri.business.service.informalsanction.ApprovalListFilter.NONE),
                org.mockito.ArgumentMatchers.any());
        org.mockito.Mockito.verify(approvalService, org.mockito.Mockito.never())
                .getInformalSanctionList(org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any());
    }

    @Test
    @WithMockCustomUser(username = "approver", esntlId = "APPROVER_ESNTL")
    @DisplayName("[DIP B5 F4] 목록 조건(제목·요청일 기간·상태)은 해석해 서비스에 넘기고, 해석할 수 없으면 400 이다")
    void passesListFiltersAndRejectsInvalidOnes() throws Exception {
        org.mockito.BDDMockito.given(approvalService.getInformalSanctionList(
                        org.mockito.ArgumentMatchers.eq("APPROVER_ESNTL"), org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any()))
                .willReturn(new org.springframework.data.domain.PageImpl<>(java.util.List.of()));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/approvals/my")
                        .param("keyword", "검토").param("fromYmd", "2026-09-01").param("toYmd", "2026-09-30").param("status", "C"))
                .andExpect(status().isOk());
        verify(approvalService).getInformalSanctionList(
                org.mockito.ArgumentMatchers.eq("APPROVER_ESNTL"),
                org.mockito.ArgumentMatchers.eq(nuri.business.service.informalsanction.ApprovalListFilter.of(
                        "검토", "2026-09-01", "2026-09-30", "C")),
                org.mockito.ArgumentMatchers.any());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/approvals/my")
                        .param("status", "X"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/approvals/pending")
                        .param("fromYmd", "2026-09-30").param("toYmd", "2026-09-01"))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verify(approvalService, org.mockito.Mockito.never()).getPendingApprovalList(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
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
        org.mockito.BDDMockito.given(approvalService.registerInformalSanction(
                        org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull()))
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
        verify(approvalService).registerInformalSanction(captor.capture(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull());
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

    @Test
    @WithMockCustomUser(username = "applicant", esntlId = "APPLICANT_ESNTL")
    @DisplayName("신청자 본인은 대기 중인 결재를 DELETE로 취소할 수 있다")
    void cancelsApprovalDraft() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/approvals/42")
                        .with(csrf()))
                .andExpect(status().isOk());

        verify(approvalService).deleteInformalSanction(42L, null);
    }

    @Test
    @WithMockCustomUser(username = "drafter", esntlId = "DRAFTER_ESNTL")
    void acceptsSequentialAndParallelStagesWithoutLegacyApprover() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON).content("""
                            {"taskSeCd":"01","docTtl":"검토 요청","docCn":"승인할 내용",
                             "stages":[{"kind":"AGREEMENT","approverIds":["REVIEWER_A","REVIEWER_B"]},
                                       {"kind":"APPROVAL","approverIds":["MANAGER"]}]}
                            """))
                .andExpect(status().isOk());
        var dto = org.mockito.ArgumentCaptor.forClass(nuri.business.service.informalsanction.dto.InformalSanctionDto.class);
        @SuppressWarnings("unchecked")
        var stages = (org.mockito.ArgumentCaptor<java.util.List<nuri.business.service.informalsanction.dto.ApprovalStageRequest>>)
                (org.mockito.ArgumentCaptor<?>) org.mockito.ArgumentCaptor.forClass(java.util.List.class);
        verify(approvalService).registerInformalSanction(dto.capture(), stages.capture(), org.mockito.ArgumentMatchers.isNull());
        org.assertj.core.api.Assertions.assertThat(dto.getValue().getDocTtl()).isEqualTo("검토 요청");
        org.assertj.core.api.Assertions.assertThat(dto.getValue().getAplcntId()).isEqualTo("DRAFTER_ESNTL");
        org.assertj.core.api.Assertions.assertThat(stages.getValue()).hasSize(2);
    }

    @Test
    @WithMockCustomUser
    void rejectsInvalidNestedStagesBeforeService() throws Exception {
        for (String stages : new String[]{"[]", "[{\"kind\":\"APPROVAL\",\"approverIds\":[]}]",
                "[{\"kind\":\"APPROVAL\",\"approverIds\":[\"\"]}]", "[null]"}) {
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals")
                            .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                            .content("{\"taskSeCd\":\"01\",\"stages\":" + stages + "}"))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(approvalService);
    }

    @Test
    @WithMockCustomUser
    void bindsVersionForDecisionsAndWithdrawal() throws Exception {
        mockMvc.perform(put("/api/v1/approvals/7/confirm").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"C\",\"version\":4,\"reason\":\"검토 완료\"}"))
                .andExpect(status().isOk());
        verify(approvalService).confirmInformalSanction(7L, "C", "검토 완료", 4);
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/approvals/7")
                        .queryParam("version", "4").with(csrf()))
                .andExpect(status().isOk());
        verify(approvalService).deleteInformalSanction(7L, 4);
    }

    @Test
    @WithMockCustomUser
    void resubmissionRequiresTheVersionReadByTheEditor() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals/7/resubmissions")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskSeCd\":\"01\",\"aprvrId\":\"BOSS\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(approvalService);
    }

    @Test
    @WithMockCustomUser(username = "owner", esntlId = "OWNER_ESNTL")
    @DisplayName("결재선 제안과 결재자 사전 확인은 요청한 사람 본인의 식별자로 부른다")
    void lineAssistUsesCurrentUser() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .get("/api/v1/approvals/line-suggestions").param("taskSeCd", "T1"))
                .andExpect(status().isOk());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals/approver-checks")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"approverIds":["A1","B2"]}
                                """))
                .andExpect(status().isOk());

        verify(lineAssistService).getSuggestions("OWNER_ESNTL", "T1");
        verify(lineAssistService).checkApprovers("OWNER_ESNTL", java.util.List.of("A1", "B2"));
    }

    @Test
    @WithMockCustomUser
    @DisplayName("사전 확인 목록이 비었거나 빈 식별자를 담으면 서비스 전에 400")
    void rejectsEmptyApproverChecks() throws Exception {
        for (String body : new String[]{"{}", "{\"approverIds\":[]}", "{\"approverIds\":[\" \"]}"}) {
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals/approver-checks")
                            .with(csrf()).contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(lineAssistService);
    }

    @Test
    @WithMockCustomUser
    @DisplayName("결재자 바꾸기·보완 요청·보완 답변은 버전과 필수 값이 있어야 서비스로 간다")
    void collaborationWritesRequireVersionAndText() throws Exception {
        String[][] cases = {
                {"PUT", "/api/v1/approvals/7/approvers", "{\"fromUserId\":\"A\",\"toUserId\":\"B\"}"},
                {"PUT", "/api/v1/approvals/7/approvers", "{\"fromUserId\":\"A\",\"version\":1}"},
                {"POST", "/api/v1/approvals/7/supplement-requests", "{\"question\":\" \",\"version\":1}"},
                {"POST", "/api/v1/approvals/7/supplement-requests", "{\"question\":\"" + "가".repeat(4001) + "\",\"version\":1}"},
                {"POST", "/api/v1/approvals/7/supplement-answers", "{\"answer\":\"\",\"version\":1}"},
                {"POST", "/api/v1/approvals/7/supplement-answers", "{\"answer\":\"답\"}"},
        };
        for (String[] c : cases) {
            var request = "PUT".equals(c[0]) ? put(c[1]) : org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(c[1]);
            mockMvc.perform(request.with(csrf()).contentType(MediaType.APPLICATION_JSON).content(c[2]))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(approvalService);
    }

    @Test
    @WithMockCustomUser
    @DisplayName("재알림·결재자 바꾸기·보완 요청·보완 답변은 경로의 문서 번호와 본문 값을 그대로 넘긴다")
    void collaborationWritesDelegate() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals/7/reminders").with(csrf()))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/v1/approvals/7/approvers").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fromUserId":"A","toUserId":"B","version":3}
                                """))
                .andExpect(status().isOk());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals/7/supplement-requests")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"question":"금액을 적어 주세요","version":3}
                                """))
                .andExpect(status().isOk());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals/7/supplement-answers")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"answer":"45만 원","docCn":"고친 본문","version":4}
                                """))
                .andExpect(status().isOk());

        verify(approvalService).remindApprovers(7L);
        verify(approvalService).replaceApprover(7L, "A", "B", 3);
        verify(approvalService).requestSupplement(7L, "금액을 적어 주세요", 3);
        verify(approvalService).answerSupplement(7L, "45만 원", "고친 본문", 4);
    }

    /**
     * [2026-10-03 D3] 임시저장은 인증 주체 본인의 것만 다룬다 — 경로의 번호와 본문은 그대로 넘기되 기안자는 언제나
     * 로그인한 사람의 esntlId 다.
     */
    @Test
    @WithMockCustomUser(username = "drafter", esntlId = "DRAFTER_ESNTL")
    @DisplayName("임시저장 목록·열기·저장·고치기·지우기는 현재 사용자의 esntlId 로 부른다")
    void temporaryDraftEndpointsUseCurrentUser() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/approvals/temporary-drafts"))
                .andExpect(status().isOk());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/approvals/temporary-drafts/5"))
                .andExpect(status().isOk());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals/temporary-drafts")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"docTtl":"쓰다 만 기안","stages":[{"kind":"AGREEMENT","approverIds":["A","B"]}]}
                                """))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/v1/approvals/temporary-drafts/5").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"taskSeCd":"01","docCn":"이어서 쓴 본문","version":2}
                                """))
                .andExpect(status().isOk());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete("/api/v1/approvals/temporary-drafts/5")
                        .with(csrf()))
                .andExpect(status().isOk());

        verify(temporaryDraftService).getTemporaryDrafts("DRAFTER_ESNTL");
        verify(temporaryDraftService).getTemporaryDraft("DRAFTER_ESNTL", 5L);
        var created = org.mockito.ArgumentCaptor.forClass(
                nuri.business.service.informalsanction.dto.ApprovalTemporaryDraftRequest.class);
        verify(temporaryDraftService).createTemporaryDraft(org.mockito.ArgumentMatchers.eq("DRAFTER_ESNTL"), created.capture());
        org.assertj.core.api.Assertions.assertThat(created.getValue().getDocTtl()).isEqualTo("쓰다 만 기안");
        org.assertj.core.api.Assertions.assertThat(created.getValue().getStages()).singleElement()
                .satisfies(stage -> org.assertj.core.api.Assertions.assertThat(stage.approverIds()).containsExactly("A", "B"));
        var updated = org.mockito.ArgumentCaptor.forClass(
                nuri.business.service.informalsanction.dto.ApprovalTemporaryDraftRequest.class);
        verify(temporaryDraftService).updateTemporaryDraft(org.mockito.ArgumentMatchers.eq("DRAFTER_ESNTL"),
                org.mockito.ArgumentMatchers.eq(5L), updated.capture());
        org.assertj.core.api.Assertions.assertThat(updated.getValue().getVersion()).isEqualTo(2);
        org.assertj.core.api.Assertions.assertThat(updated.getValue().getDocCn()).isEqualTo("이어서 쓴 본문");
        verify(temporaryDraftService).deleteTemporaryDraft("DRAFTER_ESNTL", 5L);
        verifyNoInteractions(approvalService);
    }

    @Test
    @WithMockCustomUser
    @DisplayName("임시저장 요청도 길이·결재선 형식·버전 하한을 서비스 전에 400 으로 막는다(결재자가 없는 단계 포함)")
    void rejectsMalformedTemporaryDraftBeforeService() throws Exception {
        String[][] cases = {
                {"POST", "/api/v1/approvals/temporary-drafts", "{\"taskSeCd\":\"1234567890123\"}"},
                {"POST", "/api/v1/approvals/temporary-drafts", "{\"docTtl\":\"" + "가".repeat(257) + "\"}"},
                {"POST", "/api/v1/approvals/temporary-drafts", "{\"docCn\":\"" + "가".repeat(4001) + "\"}"},
                {"POST", "/api/v1/approvals/temporary-drafts", "{\"stages\":[{\"kind\":\"APPROVAL\",\"approverIds\":[]}]}"},
                {"POST", "/api/v1/approvals/temporary-drafts", "{\"stages\":[null]}"},
                {"PUT", "/api/v1/approvals/temporary-drafts/5", "{\"docTtl\":\"제목\",\"version\":-1}"},
        };
        for (String[] c : cases) {
            var request = "PUT".equals(c[0]) ? put(c[1]) : org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(c[1]);
            mockMvc.perform(request.with(csrf()).contentType(MediaType.APPLICATION_JSON).content(c[2]))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(temporaryDraftService);
    }

    /**
     * [2026-10-03 D3] 임시저장을 이어 써서 올리는 상신은 임시저장 서비스가 같은 트랜잭션에서 소비한다. 참조가 하나만 와도
     * 조용히 무시하지 않고 그 서비스로 보낸다 — 둘 다 있는지는 서비스가 400 으로 판정한다.
     */
    @Test
    @WithMockCustomUser(username = "drafter", esntlId = "DRAFTER_ESNTL")
    @DisplayName("상신에 임시저장 번호·버전이 오면 임시저장을 소비하는 상신으로 보내고 일반 상신은 부르지 않는다")
    void createApprovalWithTemporaryDraftDelegatesToConsumingSubmit() throws Exception {
        org.mockito.BDDMockito.given(temporaryDraftService.submitWithTemporaryDraft(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any()))
                .willReturn(42L);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals")
                        .queryParam("temporaryDraftSn", "7").queryParam("temporaryDraftVersion", "3")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskSeCd\":\"01\",\"aprvrId\":\"BOSS_ESNTL\"}"))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.data").value(42));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals")
                        .queryParam("temporaryDraftSn", "8")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskSeCd\":\"01\",\"aprvrId\":\"BOSS_ESNTL\"}"))
                .andExpect(status().isOk());

        var dto = org.mockito.ArgumentCaptor.forClass(nuri.business.service.informalsanction.dto.InformalSanctionDto.class);
        verify(temporaryDraftService).submitWithTemporaryDraft(dto.capture(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq(7L), org.mockito.ArgumentMatchers.eq(3));
        org.assertj.core.api.Assertions.assertThat(dto.getValue().getAplcntId()).isEqualTo("DRAFTER_ESNTL");
        verify(temporaryDraftService).submitWithTemporaryDraft(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.eq(8L), org.mockito.ArgumentMatchers.isNull());
        verifyNoInteractions(approvalService);
    }

    @Test
    @WithMockCustomUser
    @DisplayName("임시저장 번호가 0 이하이거나 버전이 음수면 400 — 값 검사는 임시저장 서비스가 하고 결재는 올리지 않는다")
    void rejectsInvalidTemporaryDraftReference() throws Exception {
        // 값 검사는 임시저장 서비스가 한다(서비스 단위 테스트가 0·음수를 400 으로 고정한다). 컨트롤러는 그대로 넘긴다 —
        //   파라미터에 제약 어노테이션을 달면 본문 필드 오류가 사라지기 때문이다(아래 테스트).
        org.mockito.Mockito.when(temporaryDraftService.submitWithTemporaryDraft(
                        org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.eq(0L), org.mockito.ArgumentMatchers.eq(1)))
                .thenThrow(new nuri.foundation.core.exception.BusinessException(
                        nuri.foundation.core.exception.CommonErrorCode.INVALID_INPUT_VALUE, "임시저장 번호와 버전이 올바르지 않습니다."));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals")
                        .queryParam("temporaryDraftSn", "0").queryParam("temporaryDraftVersion", "1")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskSeCd\":\"01\",\"aprvrId\":\"BOSS\"}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(approvalService);
    }

    @Test
    @WithMockCustomUser
    @DisplayName("상신 본문의 검증 오류는 임시저장 참조가 있든 없든 필드별 오류로 온다 — 화면이 해당 칸에 오류를 붙인다")
    void createApprovalBodyErrorsCarryFieldErrors() throws Exception {
        for (boolean withDraft : new boolean[]{false, true}) {
            var request = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals")
                    .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"taskSeCd\":\"\",\"docTtl\":\"제목\"}");
            if (withDraft) request = request.queryParam("temporaryDraftSn", "7").queryParam("temporaryDraftVersion", "2");
            mockMvc.perform(request)
                    .andExpect(status().isBadRequest())
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.errors[*].field",
                            org.hamcrest.Matchers.hasItem("taskSeCd")))
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.errors[*].field",
                            org.hamcrest.Matchers.hasItem("approvalLinePresent")));
        }
        verifyNoInteractions(approvalService, temporaryDraftService);
    }

    // ── [2026-10-04 D4] 참조자 ─────────────────────────────────────────────────────────────────────────

    @Test
    @WithMockCustomUser(username = "cc", esntlId = "CC_ESNTL")
    @DisplayName("참조된 결재 목록은 현재 사용자의 esntlId 와 해석한 조건으로 referenced 조회를 부르고, 해석할 수 없으면 400 이다")
    void listsReferencedApprovalsForCurrentUser() throws Exception {
        org.mockito.BDDMockito.given(approvalService.getReferencedApprovalList(
                        org.mockito.ArgumentMatchers.eq("CC_ESNTL"), org.mockito.ArgumentMatchers.any(),
                        org.mockito.ArgumentMatchers.any()))
                .willReturn(new org.springframework.data.domain.PageImpl<>(java.util.List.of()));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/approvals/referenced")
                        .param("keyword", "출장").param("fromYmd", "2026-10-01").param("toYmd", "2026-10-31").param("status", "R"))
                .andExpect(status().isOk());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/v1/approvals/referenced")
                        .param("status", "X"))
                .andExpect(status().isBadRequest());

        verify(approvalService).getReferencedApprovalList(
                org.mockito.ArgumentMatchers.eq("CC_ESNTL"),
                org.mockito.ArgumentMatchers.eq(nuri.business.service.informalsanction.ApprovalListFilter.of(
                        "출장", "2026-10-01", "2026-10-31", "R")),
                org.mockito.ArgumentMatchers.any());
        org.mockito.Mockito.verify(approvalService, org.mockito.Mockito.never()).getProcessedApprovalList(
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.any());
    }

    @Test
    @WithMockCustomUser(username = "drafter", esntlId = "DRAFTER_ESNTL")
    @DisplayName("상신·재상신 본문의 참조자는 그대로 서비스로 간다")
    void draftAndResubmissionCarryReferences() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON).content("""
                            {"taskSeCd":"01","stages":[{"kind":"APPROVAL","approverIds":["BOSS"]}],"references":["CC1","CC2"]}
                            """))
                .andExpect(status().isOk());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals")
                        .queryParam("temporaryDraftSn", "7").queryParam("temporaryDraftVersion", "3")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON).content("""
                            {"taskSeCd":"01","aprvrId":"BOSS","references":["CC3"]}
                            """))
                .andExpect(status().isOk());
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals/9/resubmissions")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON).content("""
                            {"taskSeCd":"01","aprvrId":"BOSS","version":2,"references":["CC4"]}
                            """))
                .andExpect(status().isOk());

        verify(approvalService).registerInformalSanction(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.eq(java.util.List.of("CC1", "CC2")));
        verify(temporaryDraftService).submitWithTemporaryDraft(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.isNull(), org.mockito.ArgumentMatchers.eq(java.util.List.of("CC3")),
                org.mockito.ArgumentMatchers.eq(7L), org.mockito.ArgumentMatchers.eq(3));
        verify(approvalService).resubmitInformalSanction(org.mockito.ArgumentMatchers.eq(9L),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.eq(2), org.mockito.ArgumentMatchers.isNull(),
                org.mockito.ArgumentMatchers.eq(java.util.List.of("CC4")));
    }

    @Test
    @WithMockCustomUser
    @DisplayName("참조자 목록 형식(20명·빈 값·20자)이 틀리면 임시저장 참조가 있든 없든 서비스 전에 400 이고 필드별 오류로 온다")
    void malformedReferencesCarryFieldErrors() throws Exception {
        String twentyOne = java.util.stream.IntStream.rangeClosed(1, 21).mapToObj(i -> "\"R" + i + "\"")
                .collect(java.util.stream.Collectors.joining(",", "[", "]"));
        for (String references : new String[]{twentyOne, "[\"\"]", "[\"" + "x".repeat(21) + "\"]"}) {
            for (boolean withDraft : new boolean[]{false, true}) {
                var request = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"taskSeCd\":\"01\",\"aprvrId\":\"BOSS\",\"references\":" + references + "}");
                if (withDraft) request = request.queryParam("temporaryDraftSn", "7").queryParam("temporaryDraftVersion", "2");
                mockMvc.perform(request)
                        .andExpect(status().isBadRequest())
                        .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.errors[*].field",
                                org.hamcrest.Matchers.hasItem(org.hamcrest.Matchers.startsWith("references"))));
            }
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals/9/resubmissions")
                            .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                            .content("{\"taskSeCd\":\"01\",\"aprvrId\":\"BOSS\",\"version\":2,\"references\":" + references + "}"))
                    .andExpect(status().isBadRequest());
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals/temporary-drafts")
                            .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                            .content("{\"docTtl\":\"제목\",\"references\":" + references + "}"))
                    .andExpect(status().isBadRequest());
        }
        verifyNoInteractions(approvalService, temporaryDraftService);
    }

    @Test
    @WithMockCustomUser
    @DisplayName("결재자의 참조자 추가는 경로의 문서 번호·참조자·버전을 그대로 넘기고 새로 지정한 수를 돌려준다")
    void addReferencesDelegates() throws Exception {
        org.mockito.BDDMockito.given(approvalService.addReferences(7L, java.util.List.of("CC1", "CC2"), 4)).willReturn(2);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals/7/references")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"references":["CC1","CC2"],"version":4}
                                """))
                .andExpect(status().isOk())
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.data").value(2));

        verify(approvalService).addReferences(7L, java.util.List.of("CC1", "CC2"), 4);
    }

    @Test
    @WithMockCustomUser
    @DisplayName("참조자 추가는 버전과 1~20명의 참조자가 있어야 서비스로 가고, 아니면 필드별 오류로 400 이다")
    void addReferencesRequiresVersionAndReferences() throws Exception {
        String twentyOne = java.util.stream.IntStream.rangeClosed(1, 21).mapToObj(i -> "\"R" + i + "\"")
                .collect(java.util.stream.Collectors.joining(",", "[", "]"));
        String[][] cases = {
                {"{\"references\":[\"CC\"]}", "version"},
                {"{\"references\":[\"CC\"],\"version\":-1}", "version"},
                {"{\"version\":1}", "references"},
                {"{\"references\":[],\"version\":1}", "references"},
                {"{\"references\":" + twentyOne + ",\"version\":1}", "references"},
                {"{\"references\":[\" \"],\"version\":1}", "references"},
                {"{\"references\":[\"" + "x".repeat(21) + "\"],\"version\":1}", "references"},
        };
        for (String[] c : cases) {
            mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals/7/references")
                            .with(csrf()).contentType(MediaType.APPLICATION_JSON).content(c[0]))
                    .andExpect(status().isBadRequest())
                    .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath("$.errors[*].field",
                            org.hamcrest.Matchers.hasItem(org.hamcrest.Matchers.startsWith(c[1]))));
        }
        verifyNoInteractions(approvalService);
    }

    @Test
    @WithMockCustomUser(username = "drafter", esntlId = "DRAFTER_ESNTL")
    @DisplayName("임시저장 본문의 참조자도 그대로 서비스로 간다")
    void temporaryDraftCarriesReferences() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/approvals/temporary-drafts")
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"docTtl":"쓰다 만 기안","references":["CC1"]}
                                """))
                .andExpect(status().isOk());

        var created = org.mockito.ArgumentCaptor.forClass(
                nuri.business.service.informalsanction.dto.ApprovalTemporaryDraftRequest.class);
        verify(temporaryDraftService).createTemporaryDraft(org.mockito.ArgumentMatchers.eq("DRAFTER_ESNTL"), created.capture());
        org.assertj.core.api.Assertions.assertThat(created.getValue().getReferences()).containsExactly("CC1");
    }

    @Test
    @DisplayName("응답 전용 참조자 필드는 레거시 등록 본문(InformalSanctionDto)으로 들어오지 않는다")
    void legacyBodyCannotCarryReferences() {
        // 앱의 변환기 설정(Boot 매퍼)으로 읽는다 — 레거시 등록 핸들러가 이 매퍼로 본문을 바인딩한다.
        var dto = objectMapper.readValue("""
                {"taskSeCd":"01","aplcntId":"A","references":[{"userId":"CC"}],"canAddReference":true,"referenceViewer":true}
                """, nuri.business.service.informalsanction.dto.InformalSanctionDto.class);
        org.assertj.core.api.Assertions.assertThat(dto.getReferences()).isNull();
        org.assertj.core.api.Assertions.assertThat(dto.isCanAddReference()).isFalse();
        org.assertj.core.api.Assertions.assertThat(dto.isReferenceViewer()).isFalse();
    }

    @Test
    @DisplayName("보완 답변은 제목을 받지 않는다 — 운영 변환기 설정에서 docTtl 은 모르는 필드로 거부된다")
    void supplementAnswerContractHasNoTitle() {
        // 운영 application.yml 과 같은 선택(Jackson 2 기본값 + fail-on-unknown-properties). 테스트 yml 은 이 값을 두지 않아
        // MockMvc 로는 운영의 400 을 재현할 수 없으므로 요청 DTO 의 역직렬화 계약을 직접 본다.
        tools.jackson.databind.json.JsonMapper mapper = tools.jackson.databind.json.JsonMapper.builder()
                .configureForJackson2()
                .enable(tools.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .build();
        var accepted = mapper.readValue("""
                {"answer":"45만 원","docCn":"고친 본문","version":4}
                """, nuri.api.controller.business.approval.dto.ApprovalSupplementAnswerRequest.class);
        org.assertj.core.api.Assertions.assertThat(accepted.getDocCn()).isEqualTo("고친 본문");
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> mapper.readValue("""
                        {"answer":"45만 원","docTtl":"바꾼 제목","version":4}
                        """, nuri.api.controller.business.approval.dto.ApprovalSupplementAnswerRequest.class))
                .isInstanceOf(tools.jackson.databind.exc.UnrecognizedPropertyException.class)
                .hasMessageContaining("docTtl");
    }
}
