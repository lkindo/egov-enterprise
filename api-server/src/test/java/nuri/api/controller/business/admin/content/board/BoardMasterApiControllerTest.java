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
}
