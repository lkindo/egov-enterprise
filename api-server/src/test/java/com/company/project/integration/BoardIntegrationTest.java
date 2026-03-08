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

@org.junit.jupiter.api.Disabled
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
        @DisplayName("게시판 및 게시글 CRUD 통합 테스트")
        @WithMockUser(roles = "ADMIN")
        void boardIntegrationTest() throws Exception {
                // 1. 게시판 생성
                String bbsId = "BBSMSTR_TEST00000001";
                given(idgenService.getNextStringId()).willReturn(bbsId);

                BoardMasterDto masterDto = BoardMasterDto.builder()
                                .bbsNm("테스트 게시판")
                                .bbsIntrcn("테스트 게시판 설명")
                                .bbsTyCode("BBST01") // 게시판 타입
                                .tmplatId("TMPLT_001")
                                .frstRegisterId("ADMIN")
                                .build();
                boardMasterService.createBoardMaster(masterDto);

                BoardMasterDto masterResult = boardMasterService.getBoardMaster(bbsId);
                assertThat(masterResult).isNotNull();
                assertThat(masterResult.getBbsNm()).isEqualTo("테스트 게시판");

                // 2. 게시글 등록
                BoardSaveRequest saveRequest = new BoardSaveRequest(
                                bbsId,
                                "테스트 제목",
                                "테스트 내용",
                                "",
                                "",
                                "");
                Long nttId = boardService.createPost("USER_001", saveRequest);
                assertThat(nttId).isNotNull();

                // 3. 게시글 상세 조회
                BoardDto postDetail = boardService.getPostDetail(bbsId, nttId);
                assertThat(postDetail).isNotNull();
                assertThat(postDetail.getNttSj()).isEqualTo("테스트 제목");

                // 4. 게시글 목록 조회
                Page<BoardDto> posts = boardService.getBoardPosts(bbsId, PageRequest.of(0, 10));
                assertThat(posts.getContent()).isNotEmpty();
                assertThat(posts.getContent().get(0).getNttSj()).isEqualTo("테스트 제목");

                // 5. 게시글 수정
                BoardSaveRequest updateRequest = new BoardSaveRequest(
                                bbsId,
                                "수정된 제목",
                                "수정된 내용",
                                "",
                                "",
                                "");
                boardService.updatePost(bbsId, nttId, updateRequest);
                BoardDto updatedPost = boardService.getPostDetail(bbsId, nttId);
                assertThat(updatedPost.getNttSj()).isEqualTo("수정된 제목");

                // 6. 게시글 삭제
                boardService.deletePost(bbsId, nttId, "USER_001");

                // Soft delete 확인 (useAt="N")
                Board deletedPost = boardRepository.findById(nttId)
                                .orElse(null);
                assertThat(deletedPost).isNotNull();
                assertThat(deletedPost.getUseAt()).isEqualTo("N");
        }
}
