package nuri.api.controller.business.admin.content.board;

import nuri.business.service.board.BoardMasterService;
import nuri.business.service.board.dto.BoardMasterDto;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.business.support.ControllerTestSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
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
    private JwtTokenProvider jwtTokenProvider;

    @Test
    @DisplayName("게시판 목록 조회 성공")
    void getBoardMasters_Success() throws Exception {
        Page<BoardMasterDto> page = new PageImpl<>(List.of(BoardMasterDto.builder().bbsId("BBS_001").bbsTtl("Test Board").build()));
        given(boardMasterService.getBoardMasterList(any(), any(), any(Pageable.class))).willReturn(page);

        mockMvc.perform(get("/api/v1/admin/system/board-masters")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.list[0].bbsId").value("BBS_001"));
    }

    @Test
    @DisplayName("게시판 상세 조회 성공")
    void getBoardMaster_Success() throws Exception {
        given(boardMasterService.getBoardMaster(anyString())).willReturn(BoardMasterDto.builder().bbsId("BBS_001").build());

        mockMvc.perform(get("/api/v1/admin/system/board-masters/BBS_001")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.bbsId").value("BBS_001"));
    }

    @Test
    @DisplayName("게시판 생성 성공")
    void createBoardMaster_Success() throws Exception {
        given(boardMasterService.createBoardMaster(anyString(), any(BoardMasterDto.class))).willReturn("BBS_NEW");

        mockMvc.perform(post("/api/v1/admin/system/board-masters")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bbsTtl\":\"New Board\", \"bbsExpln\":\"Description\", \"bbsTypeCd\":\"TYPE\", \"bbsAtrbCd\":\"ATRB\", \"atchPsbltyFileSz\":100, \"useYn\":\"Y\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data").value("BBS_NEW"));
    }

    @Test
    @DisplayName("게시판 설정 수정 성공")
    void updateBoardMaster_Success() throws Exception {
        mockMvc.perform(put("/api/v1/admin/system/board-masters/BBS_001")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"bbsTtl\":\"Updated Board\", \"bbsTypeCd\":\"TYPE\", \"bbsAtrbCd\":\"ATRB\", \"atchPsbltyFileSz\":100, \"useYn\":\"Y\"}")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
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
}
