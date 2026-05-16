package nuri.business.api.controller.admin.content.board;

import nuri.business.service.board.EgovBoardMasterService;
import nuri.business.service.board.dto.BoardMasterDto;
import nuri.foundation.security.jwt.JwtTokenProvider;
import nuri.foundation.support.ControllerTestSupport;
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
    private EgovBoardMasterService boardMasterService;

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
                .content("{\"bbsTtl\":\"New Board\", \"bbsExpln\":\"Description\"}")
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
                .content("{\"bbsTtl\":\"Updated Board\"}")
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
}
