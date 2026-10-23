package nuri.api.controller.business.admin.content.board;

import nuri.business.service.board.BoardChangeService;
import nuri.business.service.board.BoardMasterService;
import nuri.business.service.board.dto.BoardChangeDto;
import nuri.business.service.board.dto.BoardMasterDto;
import nuri.business.service.board.dto.BoardMasterUpdateRequest;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.business.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BoardMasterApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("BoardMasterApiController (Admin) 테스트")
class BoardMasterApiControllerTest extends ControllerTestSupport {

    @MockitoBean
    private BoardMasterService boardMasterService;

    @MockitoBean
    private BoardChangeService boardChangeService;

    /** [2026-10-23 ADR-0040 결정 3·10] 운영 화면의 게시글 단위 처리(게시 기간). */
    @MockitoBean
    private nuri.business.service.board.BoardService boardService;

    @MockitoBean
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("게시판 목록 조회 성공")
    void getBoardMasters_Success() throws Exception {
        Page<BoardMasterDto> page = new PageImpl<>(List.of(BoardMasterDto.builder().bbsId("BBS_001").bbsTtl("Test Board").build()));
        given(boardMasterService.getBoardMasterList(any(), any(), any(Pageable.class))).willReturn(page);
        given(boardMasterService.designationsOf("BBS_001")).willReturn(List.of("NOTICE", "FAQ"));

        mockMvc.perform(get("/api/v1/admin/system/board-masters")
                .param("searchUseYn", "N")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].bbsId").value("BBS_001"))
                // [2026-10-23 ADR-0040 §5.2] 지정 용도를 싣고, 사용 여부 조건을 서비스까지 넘긴다.
                .andExpect(jsonPath("$.data.list[0].designations[0]").value("NOTICE"))
                .andExpect(jsonPath("$.data.list[0].designations[1]").value("FAQ"));
        org.mockito.Mockito.verify(boardMasterService).getBoardMasterList(any(), eq("N"), any(Pageable.class));
    }

    @Test
    @DisplayName("게시판 상세 조회 성공")
    void getBoardMaster_Success() throws Exception {
        given(boardMasterService.getBoardMaster(anyString())).willReturn(BoardMasterDto.builder().bbsId("BBS_001").version(7).build());
        given(boardMasterService.designationsOf("BBS_001")).willReturn(List.of());

        mockMvc.perform(get("/api/v1/admin/system/board-masters/BBS_001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.bbsId").value("BBS_001"))
                // [2026-10-23 ADR-0040 결정 10] 수정 요청에 돌려보낼 버전과, 지정이 없어도 늘 싣는 빈 지정 용도.
                .andExpect(jsonPath("$.data.version").value(7))
                .andExpect(jsonPath("$.data.designations").isEmpty());
    }

    @Test
    @DisplayName("[2026-10-23 ADR-0040 결정 9] 게시판 변경 이력 조회 - 서비스 페이지를 그대로 싣는다")
    void getBoardChangeHistory_Success() throws Exception {
        BoardChangeDto row = new BoardChangeDto(3L, "BBS", "USE", null, "게시판 사용", "Y", "N", "관리자",
                java.time.LocalDateTime.of(2026, 10, 23, 9, 0));
        given(boardChangeService.getChanges(eq("BBS_001"), any(Pageable.class))).willReturn(new PageImpl<>(List.of(row)));

        mockMvc.perform(get("/api/v1/admin/system/board-masters/BBS_001/change-history")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.list[0].chgTypeCd").value("USE"))
                .andExpect(jsonPath("$.data.list[0].chgAftrCn").value("N"))
                .andExpect(jsonPath("$.data.list[0].chgUserNm").value("관리자"));
    }

    @Test
    @DisplayName("게시판 생성 성공")
    void createBoardMaster_Success() throws Exception {
        given(boardMasterService.createBoardMaster(anyString(), any(BoardMasterDto.class))).willReturn("BBS_NEW");

        mockMvc.perform(post("/api/v1/admin/system/board-masters")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bbsTtl\":\"New Board\", \"bbsExpln\":\"Description\", \"bbsTypeCd\":\"TYPE\", \"bbsAtrbCd\":\"ATRB\", \"atchPsbltyFileSz\":100, \"useYn\":\"Y\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("BBS_NEW"));
    }

    @Test
    @DisplayName("게시판 설정 수정 성공")
    void updateBoardMaster_Success() throws Exception {
        mockMvc.perform(put("/api/v1/admin/system/board-masters/BBS_001")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bbsTtl\":\"Updated Board\", \"atchPsbltyFileSz\":100, \"useYn\":\"Y\", \"version\":2}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        org.mockito.Mockito.verify(boardMasterService).updateBoardMaster(anyString(), eq("BBS_001"),
                argThat((BoardMasterUpdateRequest request) -> "Updated Board".equals(request.getBbsTtl()) && request.getVersion() == 2));
    }

    @Test
    @DisplayName("[2026-10-23 ADR-0040 결정 10] 버전 없이 설정을 저장하면 서비스에 닿기 전에 400 이다")
    void updateBoardMaster_rejectsMissingVersion() throws Exception {
        mockMvc.perform(put("/api/v1/admin/system/board-masters/BBS_001")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bbsTtl\":\"T\", \"atchPsbltyFileSz\":100, \"useYn\":\"Y\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verifyNoInteractions(boardMasterService);
    }

    @org.junit.jupiter.params.ParameterizedTest(name = "{0}")
    @org.junit.jupiter.params.provider.ValueSource(strings = { "tmpltId", "bbsTypeCd", "bbsAtrbCd", "cmntySn" })
    @DisplayName("[2026-10-23 ADR-0040 §5.5] 설정 수정 요청은 만든 뒤 바꾸지 않는 항목을 받지 않는다 — 운영 변환기 설정에서 모르는 필드다")
    void updateRequestHasNoImmutableFields(String field) {
        // 운영 application.yml 은 fail-on-unknown-properties 를 켠다. 테스트 yml 은 이 값을 두지 않아 MockMvc 로는 운영의 400 을
        //   재현할 수 없으므로, 컨텍스트의 변환기(같은 Jackson 2 기본값·파라미터 이름 감지)에 그 한 값만 켜 역직렬화 계약을 직접 본다.
        tools.jackson.databind.ObjectMapper mapper = objectMapper.rebuild()
                .enable(tools.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .build();
        String base = "\"bbsTtl\":\"T\",\"atchPsbltyFileSz\":100,\"useYn\":\"Y\",\"version\":1";
        org.assertj.core.api.Assertions.assertThat(mapper.readValue("{" + base + "}", BoardMasterUpdateRequest.class).getVersion())
                .isEqualTo(1);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> mapper.readValue(
                        "{" + base + ",\"" + field + "\":\"X\"}", BoardMasterUpdateRequest.class))
                .isInstanceOf(tools.jackson.databind.exc.UnrecognizedPropertyException.class)
                .hasMessageContaining(field);
    }

    @Test
    @DisplayName("게시판 삭제 성공")
    void deleteBoardMaster_Success() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/system/board-masters/BBS_001")
                .param("userId", "admin")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    // --- 화면이 호출하고 있었으나 매핑이 없어 404 로 떨어지던 4종 (감사 D-9) ---

    @Test
    @DisplayName("영구 삭제 가능 여부 조회 - 서비스 판정을 그대로 전달")
    void isBoardMasterDeletable_Success() throws Exception {
        given(boardMasterService.isDeletable("BBS_001")).willReturn(true);

        mockMvc.perform(get("/api/v1/admin/system/board-masters/BBS_001/deletable")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value(true));
    }

    @Test
    @DisplayName("영구 삭제 가능 여부 조회 - 삭제 불가(게시글 잔존)")
    void isBoardMasterDeletable_False() throws Exception {
        given(boardMasterService.isDeletable("BBS_001")).willReturn(false);

        mockMvc.perform(get("/api/v1/admin/system/board-masters/BBS_001/deletable")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").value(false));
    }

    @Test
    @DisplayName("게시판 영구 삭제 성공 - 논리 삭제 경로와 구분되어 호출된다")
    void deleteBoardMasterPhysically_Success() throws Exception {
        mockMvc.perform(delete("/api/v1/admin/system/board-masters/BBS_001/physical")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        // /{bbsId} 논리 삭제가 아니라 물리 삭제가 호출되어야 한다(경로 흡수 회귀 방지)
        org.mockito.Mockito.verify(boardMasterService).deleteBoardMasterPhysically(anyString(), eq("BBS_001"));
        org.mockito.Mockito.verify(boardMasterService, org.mockito.Mockito.never())
                .deleteBoardMaster(anyString(), anyString());
    }

    @Test
    @DisplayName("사용여부 일괄 변경 성공")
    void updateBoardMasterStatusInBatch_Success() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/board-masters/batch/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bbsIds\":[\"BBS_001\",\"BBS_002\"],\"useYn\":\"N\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        org.mockito.Mockito.verify(boardMasterService)
                .updateBoardMasterStatusInBatch(anyString(), eq(List.of("BBS_001", "BBS_002")), eq("N"));
    }

    @Test
    @DisplayName("사용여부 일괄 변경 - 빈 목록은 400")
    void updateBoardMasterStatusInBatch_EmptyIds() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/board-masters/batch/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bbsIds\":[],\"useYn\":\"N\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("사용여부 일괄 변경 - Y/N 이외 값은 400")
    void updateBoardMasterStatusInBatch_InvalidUseYn() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/board-masters/batch/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bbsIds\":[\"BBS_001\"],\"useYn\":\"X\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("사용여부 일괄 변경 - 100건을 초과하면 서비스 진입 전 400")
    void updateBoardMasterStatusInBatch_TooManyIds() throws Exception {
        List<String> bbsIds = java.util.stream.IntStream.rangeClosed(1, 101)
                .mapToObj(index -> "BBS_" + index)
                .toList();

        mockMvc.perform(post("/api/v1/admin/system/board-masters/batch/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(
                        java.util.Map.of("bbsIds", bbsIds, "useYn", "N")))
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());

        org.mockito.Mockito.verify(boardMasterService, org.mockito.Mockito.never())
                .updateBoardMasterStatusInBatch(anyString(), any(), anyString());
    }

    @Test
    @DisplayName("일괄 영구 삭제 성공")
    void deleteBoardMastersInBatch_Success() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/board-masters/batch/delete")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bbsIds\":[\"BBS_001\",\"BBS_002\"]}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        org.mockito.Mockito.verify(boardMasterService)
                .deleteBoardMastersInBatch(anyString(), eq(List.of("BBS_001", "BBS_002")));
    }

    @Test
    @DisplayName("일괄 영구 삭제 - 빈 목록은 400 (전건 삭제 사고 방지)")
    void deleteBoardMastersInBatch_EmptyIds() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/board-masters/batch/delete")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bbsIds\":[]}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());

        org.mockito.Mockito.verify(boardMasterService, org.mockito.Mockito.never())
                .deleteBoardMastersInBatch(anyString(), any());
    }

    @Test
    @DisplayName("일괄 영구 삭제 - 100건을 초과하면 서비스 진입 전 400")
    void deleteBoardMastersInBatch_TooManyIds() throws Exception {
        List<String> bbsIds = java.util.stream.IntStream.rangeClosed(1, 101)
                .mapToObj(index -> "BBS_" + index)
                .toList();

        mockMvc.perform(post("/api/v1/admin/system/board-masters/batch/delete")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of("bbsIds", bbsIds)))
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());

        org.mockito.Mockito.verify(boardMasterService, org.mockito.Mockito.never())
                .deleteBoardMastersInBatch(anyString(), any());
    }

    /**
     * [2026-10-23 ADR-0040 결정 9] 되돌릴 수 없는 영구 삭제는 민감 작업 원장(SensitiveAuditInterceptor)이 남긴다 — 게시판 변경 이력은
     * 지운 게시판을 남기지 않으므로 표지가 빠지면 누가 지웠는지 남는 곳이 없다. 표지가 있는 핸들러만 인터셉터가 기록한다.
     */
    @Test
    @DisplayName("영구 삭제 핸들러 둘은 민감 작업 원장에 남는다")
    void permanentDeletesAreSensitiveOperations() throws Exception {
        for (String[] handler : new String[][] {
                {"deleteBoardMasterPhysically", "게시판 영구 삭제"},
                {"deleteBoardMastersInBatch", "게시판 일괄 영구 삭제"}}) {
            java.lang.reflect.Method method = java.util.Arrays.stream(BoardMasterApiController.class.getDeclaredMethods())
                    .filter(candidate -> candidate.getName().equals(handler[0]))
                    .findFirst().orElseThrow();
            var declared = method.getAnnotation(nuri.foundation.core.annotation.SensitiveOperation.class);
            org.assertj.core.api.Assertions.assertThat(declared).as(handler[0]).isNotNull();
            org.assertj.core.api.Assertions.assertThat(declared.value()).isEqualTo(handler[1]);
        }
        // 비활성화는 되돌릴 수 있고 게시판 변경 이력에 남으므로 민감 작업이 아니다.
        java.lang.reflect.Method deactivate = java.util.Arrays.stream(BoardMasterApiController.class.getDeclaredMethods())
                .filter(candidate -> candidate.getName().equals("deleteBoardMaster")).findFirst().orElseThrow();
        org.assertj.core.api.Assertions.assertThat(
                deactivate.getAnnotation(nuri.foundation.core.annotation.SensitiveOperation.class)).isNull();
    }

    // ── [2026-10-23 ADR-0040 §6 B1] 운영 화면의 게시 기간 빠른 편집·일괄 처리 ─────────────────────────────

    @Test
    @DisplayName("[ADR-0040 B1] 게시 기간 빠른 편집은 경로의 게시판·글 번호와 본문을 서비스에 넘긴다")
    void updatePostPeriod_delegates() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/system/board-masters/BBS_001/posts/7/period")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pstBgngYmd\":\"20261101\",\"pstEndYmd\":\"20261130\",\"version\":3}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        org.mockito.Mockito.verify(boardService).updatePostPeriod(eq("BBS_001"), eq(7L),
                argThat((nuri.business.service.board.dto.BoardPostPeriodRequest request) ->
                        "20261101".equals(request.pstBgngYmd()) && "20261130".equals(request.pstEndYmd())
                                && request.version() == 3));
    }

    @org.junit.jupiter.params.ParameterizedTest(name = "{0}")
    @org.junit.jupiter.params.provider.ValueSource(strings = {
            "{\"pstEndYmd\":\"20261130\"}",
            "{\"pstEndYmd\":\"2026-11-30\",\"version\":3}",
            "{\"pstEndYmd\":\"20260230\",\"version\":3}",
            "{\"pstBgngYmd\":\"20261201\",\"pstEndYmd\":\"20261130\",\"version\":3}",
            "{\"pstEndYmd\":\"20261130\",\"version\":-1}"})
    @DisplayName("[ADR-0040 결정 10·12] 빠른 편집 본문의 버전 누락·하이픈 날짜·달력에 없는 날짜·시작>종료·음수 버전은 서비스 전에 400")
    void updatePostPeriod_rejectsInvalidBody(String body) throws Exception {
        mockMvc.perform(patch("/api/v1/admin/system/board-masters/BBS_001/posts/7/period")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verifyNoInteractions(boardService);
    }

    @Test
    @DisplayName("[ADR-0040 B1] 일괄 처리는 동작·대상·종료일을 서비스에 넘긴다")
    void updatePostPeriodsInBatch_delegates() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/board-masters/BBS_001/posts/batch/period")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"action\":\"END_DATE\",\"pstSns\":[3,4],\"pstEndYmd\":\"20261130\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        org.mockito.Mockito.verify(boardService).updatePostPeriodsInBatch(eq("BBS_001"),
                argThat((nuri.business.service.board.dto.BoardPostPeriodBatchRequest request) ->
                        "END_DATE".equals(request.action()) && List.of(3L, 4L).equals(request.pstSns())
                                && "20261130".equals(request.pstEndYmd())));
    }

    @Test
    @DisplayName("[ADR-0040 B1] 일괄 처리 본문의 빈 대상·101건·null 원소·모르는 동작·형식 오류 날짜는 서비스 전에 400")
    void updatePostPeriodsInBatch_rejectsInvalidBody() throws Exception {
        String tooMany = objectMapper.writeValueAsString(java.util.Map.of("action", "CLEAR_END",
                "pstSns", java.util.stream.LongStream.rangeClosed(1, 101).boxed().toList()));
        for (String body : List.of(
                "{\"action\":\"CLEAR_END\",\"pstSns\":[]}",
                tooMany,
                "{\"action\":\"CLEAR_END\",\"pstSns\":[1,null]}",
                "{\"action\":\"PIN\",\"pstSns\":[1]}",
                "{\"pstSns\":[1]}",
                "{\"action\":\"END_DATE\",\"pstSns\":[1],\"pstEndYmd\":\"2026-11-30\"}")) {
            mockMvc.perform(post("/api/v1/admin/system/board-masters/BBS_001/posts/batch/period")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body)
                    .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest());
        }
        org.mockito.Mockito.verifyNoInteractions(boardService);
    }

    /**
     * [2026-10-23 ADR-0040 §6 B1] 두 운영 경로는 게시글 전체 수정 권한(BOARD_UPDATE_ALL)에 결속된다. 진입 화면 권한
     * (BBS_MST_UPDATE)만으로는 게시글 행을 바꾸지 못한다 — 설계서의 부정 시험.
     */
    @Test
    @DisplayName("[ADR-0040 B1] 게시 기간 빠른 편집·일괄 처리는 BOARD_UPDATE_ALL 에 결속되고 BBS_MST_UPDATE 만으로는 403 이다")
    void postPeriodHandlersAreBoundToUpdateAll() {
        var policy = new nuri.business.security.authorization.PermissionPolicy();
        for (String name : List.of("updatePostPeriod", "updatePostPeriodsInBatch")) {
            java.lang.reflect.Method handler = java.util.Arrays.stream(BoardMasterApiController.class.getDeclaredMethods())
                    .filter(candidate -> candidate.getName().equals(name)).findFirst().orElseThrow();
            nuri.security.support.MethodPermissionContract.assertOperation(handler, "BOARD_UPDATE_ALL", false);
            org.assertj.core.api.Assertions.assertThat(policy.allowed(
                    nuri.security.support.MethodPermissionContract.authentication(List.of("OPS"), "BBS_MST_UPDATE", "BBS_MST_READ"),
                    BoardMasterApiController.class.getName() + "#" + name))
                    .as(name).isFalse();
        }
    }

    @Test
    @DisplayName("[ADR-0040 결정 3·6] 게시판 상세는 예약 게시 설정을 싣는다(기존 게시판 기본값 N)")
    void getBoardMaster_carriesReservationSetting() throws Exception {
        given(boardMasterService.getBoardMaster(anyString())).willReturn(BoardMasterDto.builder().bbsId("BBS_001")
                .rsvtPstgPsbltyYn("Y").version(1).build());
        given(boardMasterService.designationsOf("BBS_001")).willReturn(List.of());

        mockMvc.perform(get("/api/v1/admin/system/board-masters/BBS_001").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rsvtPstgPsbltyYn").value("Y"));

        given(boardMasterService.getBoardMaster(anyString())).willReturn(BoardMasterDto.builder().bbsId("BBS_001")
                .version(1).build());
        mockMvc.perform(get("/api/v1/admin/system/board-masters/BBS_001").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.rsvtPstgPsbltyYn").value("N"));
    }

    @Test
    @DisplayName("[ADR-0040 결정 3·6] 설정 수정 요청의 예약 게시는 Y·N 만 받는다")
    void updateBoardMaster_rejectsUnknownReservationValue() throws Exception {
        mockMvc.perform(put("/api/v1/admin/system/board-masters/BBS_001")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bbsTtl\":\"T\", \"atchPsbltyFileSz\":100, \"useYn\":\"Y\", \"version\":2, \"rsvtPstgPsbltyYn\":\"X\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verifyNoInteractions(boardMasterService);
    }

    // ── [2026-10-23 ADR-0040 §6 B2] 운영 화면의 상단 고정·해제(단건·일괄) ─────────────────────────────

    @Test
    @DisplayName("[ADR-0040 B2] 상단 고정 단건은 경로의 게시판·글 번호와 본문을 서비스에 넘긴다")
    void updatePostPin_delegates() throws Exception {
        mockMvc.perform(patch("/api/v1/admin/system/board-masters/BBS_001/posts/7/pin")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"upendFixYn\":\"Y\",\"upendFixEndYmd\":\"20261130\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        org.mockito.Mockito.verify(boardService).updatePostPin(eq("BBS_001"), eq(7L),
                argThat((nuri.business.service.board.dto.BoardPostPinRequest request) ->
                        "Y".equals(request.upendFixYn()) && "20261130".equals(request.upendFixEndYmd())));
    }

    @org.junit.jupiter.params.ParameterizedTest(name = "{0}")
    @org.junit.jupiter.params.provider.ValueSource(strings = {
            "{}",
            "{\"upendFixYn\":\"\"}",
            "{\"upendFixYn\":\"X\"}",
            "{\"upendFixYn\":\"Y\",\"upendFixEndYmd\":\"2026-11-30\"}",
            "{\"upendFixYn\":\"Y\",\"upendFixEndYmd\":\"20260230\"}"})
    @DisplayName("[ADR-0040 결정 5] 상단 고정 본문의 고정 여부 누락·Y/N 밖의 값·하이픈 날짜·달력에 없는 날짜는 서비스 전에 400")
    void updatePostPin_rejectsInvalidBody(String body) throws Exception {
        mockMvc.perform(patch("/api/v1/admin/system/board-masters/BBS_001/posts/7/pin")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body)
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verifyNoInteractions(boardService);
    }

    @Test
    @DisplayName("[ADR-0040 B2] 상단 고정 일괄 처리는 대상·고정 여부·종료일을 서비스에 넘긴다")
    void updatePostPinsInBatch_delegates() throws Exception {
        mockMvc.perform(post("/api/v1/admin/system/board-masters/BBS_001/posts/batch/pin")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"pstSns\":[3,4],\"upendFixYn\":\"N\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
        org.mockito.Mockito.verify(boardService).updatePostPinsInBatch(eq("BBS_001"),
                argThat((nuri.business.service.board.dto.BoardPostPinBatchRequest request) ->
                        "N".equals(request.upendFixYn()) && List.of(3L, 4L).equals(request.pstSns())
                                && request.upendFixEndYmd() == null));
    }

    @Test
    @DisplayName("[ADR-0040 B2] 상단 고정 일괄 본문의 빈 대상·101건·null 원소·고정 여부 누락·모르는 값·형식 오류 날짜는 서비스 전에 400")
    void updatePostPinsInBatch_rejectsInvalidBody() throws Exception {
        String tooMany = objectMapper.writeValueAsString(java.util.Map.of("upendFixYn", "N",
                "pstSns", java.util.stream.LongStream.rangeClosed(1, 101).boxed().toList()));
        for (String body : List.of(
                "{\"pstSns\":[],\"upendFixYn\":\"Y\"}",
                tooMany,
                "{\"pstSns\":[1,null],\"upendFixYn\":\"Y\"}",
                "{\"pstSns\":[1]}",
                "{\"pstSns\":[1],\"upendFixYn\":\"PIN\"}",
                "{\"pstSns\":[1],\"upendFixYn\":\"Y\",\"upendFixEndYmd\":\"2026-11-30\"}")) {
            mockMvc.perform(post("/api/v1/admin/system/board-masters/BBS_001/posts/batch/pin")
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(body)
                    .accept(MediaType.APPLICATION_JSON))
                    .andExpect(status().isBadRequest());
        }
        org.mockito.Mockito.verifyNoInteractions(boardService);
    }

    /**
     * [2026-10-23 ADR-0040 §6 B2] 두 고정 경로는 게시글 상단 고정 권한(BOARD_PIN)에 결속된다. 게시 기간 경로와 핸들러를 나눈 이유가 이것이다
     * — 게시글 전체 수정 권한(BOARD_UPDATE_ALL)이나 설정 권한(BBS_MST_UPDATE)만으로는 고정하지 못한다(H3).
     */
    @Test
    @DisplayName("[ADR-0040 B2] 상단 고정 단건·일괄은 BOARD_PIN 에 결속되고 BOARD_UPDATE_ALL·BBS_MST_UPDATE 만으로는 403 이다")
    void pinHandlersAreBoundToBoardPin() {
        var policy = new nuri.business.security.authorization.PermissionPolicy();
        for (String name : List.of("updatePostPin", "updatePostPinsInBatch")) {
            java.lang.reflect.Method handler = java.util.Arrays.stream(BoardMasterApiController.class.getDeclaredMethods())
                    .filter(candidate -> candidate.getName().equals(name)).findFirst().orElseThrow();
            nuri.security.support.MethodPermissionContract.assertOperation(handler, "BOARD_PIN", false);
            org.assertj.core.api.Assertions.assertThat(policy.allowed(
                    nuri.security.support.MethodPermissionContract.authentication(List.of("OPS"),
                            "BOARD_UPDATE_ALL", "BBS_MST_UPDATE", "BBS_MST_READ"),
                    BoardMasterApiController.class.getName() + "#" + name))
                    .as(name).isFalse();
            org.assertj.core.api.Assertions.assertThat(policy.allowed(
                    nuri.security.support.MethodPermissionContract.authentication(List.of("OPS"), "BOARD_PIN"),
                    BoardMasterApiController.class.getName() + "#" + name))
                    .as(name).isTrue();
        }
    }

    @Test
    @DisplayName("[ADR-0040 결정 5·6] 게시판 상세는 상단 고정 정책(허용·상한·기본 일수)을 싣는다")
    void getBoardMaster_carriesPinPolicy() throws Exception {
        given(boardMasterService.getBoardMaster(anyString())).willReturn(BoardMasterDto.builder().bbsId("BBS_001")
                .upendFixPsbltyYn("Y").upendFixUplmtNocs(3).upendFixBscDayCnt(14).version(1).build());
        given(boardMasterService.designationsOf("BBS_001")).willReturn(List.of());

        mockMvc.perform(get("/api/v1/admin/system/board-masters/BBS_001").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.upendFixPsbltyYn").value("Y"))
                .andExpect(jsonPath("$.data.upendFixUplmtNocs").value(3))
                .andExpect(jsonPath("$.data.upendFixBscDayCnt").value(14));

        given(boardMasterService.getBoardMaster(anyString())).willReturn(BoardMasterDto.builder().bbsId("BBS_001")
                .version(1).build());
        mockMvc.perform(get("/api/v1/admin/system/board-masters/BBS_001").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.upendFixPsbltyYn").value("N"));
    }

    @org.junit.jupiter.params.ParameterizedTest(name = "{0}")
    @org.junit.jupiter.params.provider.ValueSource(strings = {
            "\"upendFixPsbltyYn\":\"X\"",
            "\"upendFixUplmtNocs\":0",
            "\"upendFixUplmtNocs\":101",
            "\"upendFixBscDayCnt\":0",
            "\"upendFixBscDayCnt\":366"})
    @DisplayName("[ADR-0040 결정 5·6] 설정 수정의 상단 고정 허용은 Y·N, 상한은 1~100, 기본 일수는 1~365 만 받는다")
    void updateBoardMaster_rejectsPinPolicyOutOfRange(String field) throws Exception {
        mockMvc.perform(put("/api/v1/admin/system/board-masters/BBS_001")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bbsTtl\":\"T\", \"atchPsbltyFileSz\":100, \"useYn\":\"Y\", \"version\":2, " + field + "}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verifyNoInteractions(boardMasterService);
    }

    // ── [2026-10-23 ADR-0040 B3] 비밀글 정책·추천 받기 ─────────────────────────────

    @Test
    @DisplayName("[ADR-0040 결정 6·7] 게시판 상세는 비밀글 정책·추천 받기를 싣는다(기존 게시판 기본값 NONE·Y)")
    void getBoardMaster_carriesPostPolicies() throws Exception {
        given(boardMasterService.getBoardMaster(anyString())).willReturn(BoardMasterDto.builder().bbsId("BBS_001")
                .prvtPstPlcyCd("REQUIRED").rcmdtnUseYn("N").version(1).build());
        given(boardMasterService.designationsOf("BBS_001")).willReturn(List.of());

        mockMvc.perform(get("/api/v1/admin/system/board-masters/BBS_001").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.prvtPstPlcyCd").value("REQUIRED"))
                .andExpect(jsonPath("$.data.rcmdtnUseYn").value("N"));

        given(boardMasterService.getBoardMaster(anyString())).willReturn(BoardMasterDto.builder().bbsId("BBS_001")
                .version(1).build());
        mockMvc.perform(get("/api/v1/admin/system/board-masters/BBS_001").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.prvtPstPlcyCd").value("NONE"))
                .andExpect(jsonPath("$.data.rcmdtnUseYn").value("Y"));
    }

    @Test
    @DisplayName("[ADR-0040 결정 6·7] 설정 수정 요청은 비밀글 정책·추천 받기를 서비스까지 그대로 넘긴다")
    void updateBoardMaster_passesPostPolicies() throws Exception {
        mockMvc.perform(put("/api/v1/admin/system/board-masters/BBS_001")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bbsTtl\":\"T\", \"atchPsbltyFileSz\":100, \"useYn\":\"Y\", \"version\":2,"
                        + " \"prvtPstPlcyCd\":\"OPTIONAL\", \"rcmdtnUseYn\":\"N\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
        org.mockito.Mockito.verify(boardMasterService).updateBoardMaster(anyString(), eq("BBS_001"),
                argThat((BoardMasterUpdateRequest request) -> "OPTIONAL".equals(request.getPrvtPstPlcyCd())
                        && "N".equals(request.getRcmdtnUseYn())));
    }

    @org.junit.jupiter.params.ParameterizedTest(name = "{0}")
    @org.junit.jupiter.params.provider.ValueSource(strings = {
            "\"prvtPstPlcyCd\":\"SECRET\"",
            "\"prvtPstPlcyCd\":\"required\"",
            "\"prvtPstPlcyCd\":\"\"",
            "\"rcmdtnUseYn\":\"X\"",
            "\"rcmdtnUseYn\":\"y\""})
    @DisplayName("[ADR-0040 결정 6·7] 설정 수정·생성의 비밀글 정책은 NONE·OPTIONAL·REQUIRED, 추천 받기는 Y·N 만 받는다")
    void boardMasterWrites_rejectUnknownPostPolicyValues(String field) throws Exception {
        mockMvc.perform(put("/api/v1/admin/system/board-masters/BBS_001")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bbsTtl\":\"T\", \"atchPsbltyFileSz\":100, \"useYn\":\"Y\", \"version\":2, " + field + "}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/v1/admin/system/board-masters")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bbsTtl\":\"New Board\", \"bbsTypeCd\":\"TYPE\", \"bbsAtrbCd\":\"ATRB\", \"atchPsbltyFileSz\":100,"
                        + " \"useYn\":\"Y\", " + field + "}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
        org.mockito.Mockito.verifyNoInteractions(boardMasterService);
    }
}
