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
        @DisplayName("게시??마스???�록 �?게시글 CRUD ?�스??)
        @WithMockUser(roles = "ADMIN")
        void boardIntegrationTest() throws Exception {
                // 1. 게시??마스???�록
                String bbsId = "BBSMSTR_TEST00000001";
                given(idgenService.getNextStringId()).willReturn(bbsId);

                BoardMasterDto masterDto = BoardMasterDto.builder()
                                .bbsNm("?�스?�게?�판")
                                .bbsIntrcn("?�스?�게?�판?�명")
                                .bbsTyCode("BBST01") // ?�반게시??                                .bbsAttrbCode("BBSA01") // ?�반게시???�성
                                .tmplatId("TMPLT_001")
                                .frstRegisterId("ADMIN")
                                .build();
                boardMasterService.createBoardMaster(masterDto);

                BoardMasterDto masterResult = boardMasterService.getBoardMaster(bbsId);
                assertThat(masterResult).isNotNull();
                assertThat(masterResult.getBbsNm()).isEqualTo("?�스?�게?�판");

                // 2. 게시글 ?�록
                BoardSaveRequest saveRequest = new BoardSaveRequest(
                                bbsId,
                                "?�스?�게?��??�목",
                                "?�스?�게?��??�용",
                                "",
                                "",
                                "");
                Long nttId = boardService.createPost("USER_001", saveRequest);
                assertThat(nttId).isNotNull();

                // 3. 게시글 ?�세 조회
                BoardDto postDetail = boardService.getPostDetail(bbsId, nttId);
                assertThat(postDetail).isNotNull();
                assertThat(postDetail.getNttSj()).isEqualTo("?�스?�게?��??�목");

                // 4. 게시글 목록 조회
                Page<BoardDto> posts = boardService.getBoardPosts(bbsId, PageRequest.of(0, 10));
                assertThat(posts.getContent()).isNotEmpty();
                assertThat(posts.getContent().get(0).getNttSj()).isEqualTo("?�스?�게?��??�목");

                // 5. 게시글 ?�정
                BoardSaveRequest updateRequest = new BoardSaveRequest(
                                bbsId,
                                "?�스?�게?��??�목?�정",
                                "?�스?�게?��??�용?�정",
                                "",
                                "",
                                "");
                boardService.updatePost(bbsId, nttId, updateRequest);
                BoardDto updatedPost = boardService.getPostDetail(bbsId, nttId);
                assertThat(updatedPost.getNttSj()).isEqualTo("?�스?�게?��??�목?�정");

                // 6. 게시글 ??��
                boardService.deletePost(bbsId, nttId, "USER_001");
                // Soft delete ?�인 (useAt="N") - getPostDetail filters by useAt='Y', so we use
                // repository directly
                Board deletedPost = boardRepository.findById(nttId)
                                .orElse(null);
                assertThat(deletedPost).isNotNull();
                assertThat(deletedPost.getUseAt()).isEqualTo("N");
        }
}
