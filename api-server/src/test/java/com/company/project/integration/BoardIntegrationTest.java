package com.company.project.integration;

import com.company.project.config.MinimalTestConfig;
import com.company.project.domain.board.Board;

import com.company.project.domain.board.BoardRepository;
import com.company.project.service.board.BoardMasterService;
import com.company.project.service.board.BoardService;
import com.company.project.service.board.dto.BoardDto;
import com.company.project.service.board.dto.BoardMasterDto;
import com.company.project.service.board.dto.BoardSaveRequest;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

@SpringBootTest(classes = MinimalTestConfig.class)
@Transactional
@ActiveProfiles("test")
public class BoardIntegrationTest {

    @Autowired
    private BoardMasterService boardMasterService;

    @Autowired
    private BoardService boardService;

    @Autowired
    private BoardRepository boardRepository;

    @Autowired
    @Qualifier("egovBBSMstrIdGnrService")
    private EgovIdGnrService idgenService;

    @Test
    @DisplayName("게시판게시판등록??게시글 CRUD ?좎럩???)")
    @WithMockUser(roles = "ADMIN")
    void boardIntegrationTest() throws Exception {
        // 1. 게시판게시판등록
        String bbsId = "BBSMSTR_TEST00000001";
        given(idgenService.getNextStringId()).willReturn(bbsId);

        BoardMasterDto masterDto = BoardMasterDto.builder()
                .bbsNm("게시판스펙?")
                .bbsIntrcn("게시판스펙??좎럥梨?")
                .bbsTyCode("BBST01") // // 게시판 타입                .bbsAttrbCode("BBSA01") // // 게시판 타입코드
                .tmplatId("TMPLT_001")
                .frstRegisterId("ADMIN")
                .build();
        boardMasterService.createBoardMaster(masterDto);

        BoardMasterDto masterResult = boardMasterService.getBoardMaster(bbsId);
        assertThat(masterResult).isNotNull();
        assertThat(masterResult.getBbsNm()).isEqualTo("게시판스펙?");

        // 2. 게시글 등록
        BoardSaveRequest saveRequest = new BoardSaveRequest(
                bbsId,
                "게시판??좎룞????좎럥??",
                "게시판??좎룞????좎럩??",
                "",
                "",
                "");
        Long nttId = boardService.createPost("USER_001", saveRequest);
        assertThat(nttId).isNotNull();

        // 3. 게시글 코드 조회
        BoardDto postDetail = boardService.getPostDetail(bbsId, nttId);
        assertThat(postDetail).isNotNull();
        assertThat(postDetail.getNttSj()).isEqualTo("게시판??좎룞????좎럥??");

        // 4. 게시글 목록조회
        Page<BoardDto> posts = boardService.getBoardPosts(bbsId, PageRequest.of(0, 10));
        assertThat(posts.getContent()).isNotEmpty();
        assertThat(posts.getContent().get(0).getNttSj()).isEqualTo("게시판??좎룞????좎럥??");

        // 5. 게시글 ?좎럩??
        BoardSaveRequest updateRequest = new BoardSaveRequest(
                bbsId,
                "게시판??좎룞????좎럥???좎럩??",
                "게시판??좎룞????좎럩???좎럩??",
                "",
                "",
                "");
        boardService.updatePost(bbsId, nttId, updateRequest);
        BoardDto updatedPost = boardService.getPostDetail(bbsId, nttId);
        assertThat(updatedPost.getNttSj()).isEqualTo("게시판??좎룞????좎럥???좎럩??");

        // 6. 게시글 ??좎룞??
        boardService.deletePost(bbsId, nttId, "USER_001");
        // Soft delete ?좎럩??(useAt="N") - getPostDetail filters by useAt='Y', so we use
        // repository directly
        Board deletedPost = boardRepository.findById(nttId)
                .orElse(null);
        assertThat(deletedPost).isNotNull();
        assertThat(deletedPost.getUseAt()).isEqualTo("N");
    }
}
