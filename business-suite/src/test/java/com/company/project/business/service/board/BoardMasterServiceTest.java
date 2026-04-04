package com.company.project.business.service.board;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.business.domain.board.*;
import com.company.project.business.service.board.dto.BlogDto;
import com.company.project.business.service.board.dto.BoardMasterDto;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@org.mockito.junit.jupiter.MockitoSettings(strictness = org.mockito.quality.Strictness.LENIENT)
@DisplayName("BoardMasterService 단위 테스트")
class BoardMasterServiceTest {

    @InjectMocks
    private BoardMasterService boardMasterService;

    @Mock
    private BoardMasterRepository boardMasterRepository;

    @Mock
    private BlogRepository blogRepository;

    @Mock
    private BlogUserRepository blogUserRepository;

    @Mock(name = "idgenService")
    private EgovIdGnrService idgenService;

    @Test
    @DisplayName("게시판 마스터 단건 조회 - 성공")
    void getBoardMaster_Success() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").bbsNm("Test Board").build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));

        BoardMasterDto result = boardMasterService.getBoardMaster("BBS_01");

        assertThat(result).isNotNull();
        assertThat(result.getBbsNm()).isEqualTo("Test Board");
    }

    @Test
    @DisplayName("게시판 마스터 단건 조회 - 실패")
    void getBoardMaster_Fail() {
        given(boardMasterRepository.findById("BBS_99")).willReturn(Optional.empty());

        assertThrows(BusinessException.class, () -> boardMasterService.getBoardMaster("BBS_99"));
    }

    @Test
    @DisplayName("게시판 마스터 목록 검색")
    void getBoardMasterList() {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        BoardMasterSearchResult searchResult = mockSearchResult("BBS_01", "Test Board");
        Page<BoardMasterSearchResult> page = new PageImpl<>(List.of(searchResult));
        
        given(boardMasterRepository.searchBoardMasters(any(), any())).willReturn(page);

        Page<BoardMasterDto> result = boardMasterService.getBoardMasterList("0", "Test", pageable);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getBbsNm()).isEqualTo("Test Board");
    }
    
    private BoardMasterSearchResult mockSearchResult(String bbsId, String bbsNm) {
        return new BoardMasterSearchResult() {
            @Override public String getBbsId() { return bbsId; }
            @Override public String getBbsNm() { return bbsNm; }
            @Override public String getBbsTyCode() { return "TY01"; }
            @Override public String getBbsAttrbCode() { return "AT01"; }
            @Override public String getTmplatId() { return "TMP_01"; }
            @Override public String getUseAt() { return "Y"; }
        };
    }

    @Test
    @DisplayName("게시판 마스터 생성")
    void createBoardMaster() throws Exception {
        given(idgenService.getNextStringId()).willReturn("BBS_01");
        BoardMasterDto dto = BoardMasterDto.builder().bbsNm("New Board").build();

        String bbsId = boardMasterService.createBoardMaster(dto);

        assertThat(bbsId).isEqualTo("BBS_01");
        verify(boardMasterRepository).save(any(BoardMaster.class));
    }

    @Test
    @DisplayName("게시판 마스터 수정")
    void updateBoardMaster() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").bbsNm("Old Board").build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));

        BoardMasterDto dto = BoardMasterDto.builder().bbsId("BBS_01").bbsNm("Updated Board").build();
        boardMasterService.updateBoardMaster(dto);

        assertThat(master.getBbsNm()).isEqualTo("Updated Board");
    }

    @Test
    @DisplayName("게시판 마스터 삭제 (논리삭제)")
    void deleteBoardMaster() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").useAt("Y").build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));

        boardMasterService.deleteBoardMaster("BBS_01", "user1");

        assertThat(master.getUseAt()).isEqualTo("N");
    }

    @Test
    @DisplayName("만족도 및 댓글 사용 가능 여부 확인")
    void canUseSatisfactionAndComment() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").stsfdgAt("Y").commentAt("N").build();
        given(boardMasterRepository.findById("BBS_01")).willReturn(Optional.of(master));

        assertThat(boardMasterService.canUseSatisfaction("BBS_01")).isTrue();
        assertThat(boardMasterService.canUseComment("BBS_01")).isFalse();
    }

    @Test
    @DisplayName("블로그 목록 조회")
    void getBlogList() {
        Pageable pageable = org.springframework.data.domain.PageRequest.of(0, 10);
        Blog blog = Blog.builder().blogId("BLOG_01").blogNm("My Blog").build();
        given(blogRepository.findAll(pageable)).willReturn(new PageImpl<>(List.of(blog)));

        Page<BlogDto> result = boardMasterService.getBlogList(null, null, pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getBlogId()).isEqualTo("BLOG_01");
    }

    @Test
    @DisplayName("블로그 단건 조회")
    void getBlog() {
        Blog blog = Blog.builder().blogId("BLOG_01").blogNm("My Blog").build();
        given(blogRepository.findById("BLOG_01")).willReturn(Optional.of(blog));

        BlogDto result = boardMasterService.getBlog("BLOG_01");

        assertThat(result).isNotNull();
        assertThat(result.getBlogNm()).isEqualTo("My Blog");
    }
    
    @Test
    @DisplayName("블로그 생성")
    void createBlog() {
        BlogDto dto = BlogDto.builder().blogId("BLOG_01").blogNm("New Blog").build();
        boardMasterService.createBlog(dto);
        verify(blogRepository).save(any(Blog.class));
    }
    
    @Test
    @DisplayName("블로그 유저 가입")
    void joinBlog() {
        boardMasterService.joinBlog("BLOG_01", "user1", "N");
        verify(blogUserRepository).save(any(BlogUser.class));
    }

    @Test
    @DisplayName("포틀릿 및 커뮤니티용 게시판 조회")
    void getPortletAndCommunityLists() {
        BoardMaster master = BoardMaster.builder().bbsId("BBS_01").build();
        given(boardMasterRepository.findAll(any(Pageable.class))).willReturn(new PageImpl<>(List.of(master)));
        given(boardMasterRepository.findByCmmntyIdAndUseAt("CMMNTY_01", "Y")).willReturn(List.of(master));

        assertThat(boardMasterService.getBoardMasterListPortlet()).hasSize(1);
        assertThat(boardMasterService.getBoardMasterListByCommunity("CMMNTY_01")).hasSize(1);
    }
}
