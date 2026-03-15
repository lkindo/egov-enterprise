package com.company.project.api.controller.system.content.board;

import com.company.project.service.board.EgovBoardMasterService;
import com.company.project.service.board.dto.BoardMasterDto;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.data.domain.PageImpl;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BoardMasterApiController.class)
@AutoConfigureMockMvc(addFilters = false)
@DisplayName("BoardMasterApiController 테스트")
class BoardMasterApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private EgovBoardMasterService boardMasterService;

    private final String BASE_URL = "/api/v1/admin/system/boards";

    @Test
    @DisplayName("게시판 목록 조회 성공")
    void getBoardMasters_Success() throws Exception {
        given(boardMasterService.getBoardMasterList(any(), any(), any()))
                .willReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("게시판 상세 조회 성공")
    void getBoardMaster_Success() throws Exception {
        BoardMasterDto dto = BoardMasterDto.builder().bbsId("BBS01").build();
        given(boardMasterService.getBoardMaster("BBS01")).willReturn(dto);

        mockMvc.perform(get(BASE_URL + "/BBS01")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bbsId").value("BBS01"));
    }
}
