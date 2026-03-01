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
        @DisplayName("ê²Œì‹œ??ë§ˆìŠ¤???±ë¡ ë°?ê²Œì‹œê¸€ CRUD ?ŒìŠ¤??)
        @WithMockUser(roles = "ADMIN")
        void boardIntegrationTest() throws Exception {
                // 1. ê²Œì‹œ??ë§ˆìŠ¤???±ë¡
                String bbsId = "BBSMSTR_TEST00000001";
                given(idgenService.getNextStringId()).willReturn(bbsId);

                BoardMasterDto masterDto = BoardMasterDto.builder()
                                .bbsNm("?ŒìŠ¤?¸ê²Œ?œíŒ")
                                .bbsIntrcn("?ŒìŠ¤?¸ê²Œ?œíŒ?¤ëª…")
                                .bbsTyCode("BBST01") // ?¼ë°˜ê²Œì‹œ??                                .bbsAttrbCode("BBSA01") // ?¼ë°˜ê²Œì‹œ???ì„±
                                .tmplatId("TMPLT_001")
                                .frstRegisterId("ADMIN")
                                .build();
                boardMasterService.createBoardMaster(masterDto);

                BoardMasterDto masterResult = boardMasterService.getBoardMaster(bbsId);
                assertThat(masterResult).isNotNull();
                assertThat(masterResult.getBbsNm()).isEqualTo("?ŒìŠ¤?¸ê²Œ?œíŒ");

                // 2. ê²Œì‹œê¸€ ?±ë¡
                BoardSaveRequest saveRequest = new BoardSaveRequest(
                                bbsId,
                                "?ŒìŠ¤?¸ê²Œ?œê??œëª©",
                                "?ŒìŠ¤?¸ê²Œ?œê??´ìš©",
                                "",
                                "",
                                "");
                Long nttId = boardService.createPost("USER_001", saveRequest);
                assertThat(nttId).isNotNull();

                // 3. ê²Œì‹œê¸€ ?ì„¸ ì¡°íšŒ
                BoardDto postDetail = boardService.getPostDetail(bbsId, nttId);
                assertThat(postDetail).isNotNull();
                assertThat(postDetail.getNttSj()).isEqualTo("?ŒìŠ¤?¸ê²Œ?œê??œëª©");

                // 4. ê²Œì‹œê¸€ ëª©ë¡ ì¡°íšŒ
                Page<BoardDto> posts = boardService.getBoardPosts(bbsId, PageRequest.of(0, 10));
                assertThat(posts.getContent()).isNotEmpty();
                assertThat(posts.getContent().get(0).getNttSj()).isEqualTo("?ŒìŠ¤?¸ê²Œ?œê??œëª©");

                // 5. ê²Œì‹œê¸€ ?˜ì •
                BoardSaveRequest updateRequest = new BoardSaveRequest(
                                bbsId,
                                "?ŒìŠ¤?¸ê²Œ?œê??œëª©?˜ì •",
                                "?ŒìŠ¤?¸ê²Œ?œê??´ìš©?˜ì •",
                                "",
                                "",
                                "");
                boardService.updatePost(bbsId, nttId, updateRequest);
                BoardDto updatedPost = boardService.getPostDetail(bbsId, nttId);
                assertThat(updatedPost.getNttSj()).isEqualTo("?ŒìŠ¤?¸ê²Œ?œê??œëª©?˜ì •");

                // 6. ê²Œì‹œê¸€ ?? œ
                boardService.deletePost(bbsId, nttId, "USER_001");
                // Soft delete ?•ì¸ (useAt="N") - getPostDetail filters by useAt='Y', so we use
                // repository directly
                Board deletedPost = boardRepository.findById(nttId)
                                .orElse(null);
                assertThat(deletedPost).isNotNull();
                assertThat(deletedPost.getUseAt()).isEqualTo("N");
        }
}
