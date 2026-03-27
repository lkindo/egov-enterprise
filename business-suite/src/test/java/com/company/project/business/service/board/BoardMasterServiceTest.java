package com.company.project.business.service.board;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.business.domain.board.*;
import com.company.project.business.service.board.dto.BlogDto;
import com.company.project.business.service.board.dto.BoardMasterDto;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BoardMasterServiceTest {

  @Mock
  private BoardMasterRepository boardMasterRepository;
  @Mock
  private BlogRepository blogRepository;
  @Mock
  private BlogUserRepository blogUserRepository;
  @Mock
  private EgovIdGnrService idgenService;

  @InjectMocks
  private BoardMasterService boardMasterService;

  private BoardMaster mockBoardMaster;
  private BoardMasterDto boardMasterDto;

  @BeforeEach
  void setUp() {
    mockBoardMaster = BoardMaster.builder()
        .bbsId("BBS_0000000001")
        .bbsNm("Board")
        .bbsIntrcn("Success")
        .bbsTyCode("BBST01")
        .bbsAttrbCode("BBSA01")
        .replyPosblAt("Y")
        .fileAtchPosblAt("Y")
        .atchPosblFileNumber(3)
        .atchPosblFileSize(1024L * 1024L * 5L)
        .tmplatId("TMPL01")
        .useAt("Y")
        .createdBy("USER001")
        .lastModifiedBy("USER001")
        .blogAt("N")
        .commentAt("Y")
        .stsfdgAt("Y")
        .build();

    boardMasterDto = BoardMasterDto.builder()
        .bbsId("BBS_0000000001")
        .bbsNm("Board")
        .bbsIntrcn("Success")
        .bbsTyCode("BBST01")
        .bbsAttrbCode("BBSA01")
        .replyPosblAt("Y")
        .fileAtchPosblAt("Y")
        .atchPosblFileNumber(3)
        .atchPosblFileSize(1024L * 1024L * 5L)
        .tmplatId("TMPL01")
        .useAt("Y")
        .frstRegisterId("USER001")
        .lastUpdusrId("USER001")
        .blogAt("N")
        .commentAt("Y")
        .stsfdgAt("Y")
        .build();
  }

  @Test
@DisplayName("Board Master detail success")
  void getBoardMaster_success() {
    when(boardMasterRepository.findById("BBS_0000000001")).thenReturn(Optional.of(mockBoardMaster));
    BoardMasterDto result = boardMasterService.getBoardMaster("BBS_0000000001");
    assertThat(result.getBbsId()).isEqualTo("BBS_0000000001");
  }

  @Test
@DisplayName("Board Master detail fail - not found")
  void getBoardMaster_fail_notFound() {
    when(boardMasterRepository.findById("NONEXISTENT")).thenReturn(Optional.empty());
    assertThatThrownBy(() -> boardMasterService.getBoardMaster("NONEXISTENT"))
        .isInstanceOf(BusinessException.class);
  }

  @Test
@DisplayName("Board Master list success")
  void getBoardMasterList_success() {
    List<BoardMasterSearchResult> searchResults = Arrays.asList(
        BoardMasterSearchResult.builder().bbsId("BBS_0000000001").bbsNm("Board").useAt("Y").build());
    when(boardMasterRepository.searchBoardMasters(any(), any())).thenReturn(new PageImpl<>(searchResults));
    Page<BoardMasterDto> result = boardMasterService.getBoardMasterList("1", "test", PageRequest.of(0, 10));
    assertThat(result).hasSize(1);
  }

  @Test
@DisplayName("Board Master create success")
  void createBoardMaster_success() throws Exception {
    when(idgenService.getNextStringId()).thenReturn("BBS_NEW0000001");
    boardMasterService.createBoardMaster(boardMasterDto);
    verify(boardMasterRepository).save(any(BoardMaster.class));
  }

  @Test
@DisplayName("Board Master update success")
  void updateBoardMaster_success() {
    when(boardMasterRepository.findById("BBS_0000000001")).thenReturn(Optional.of(mockBoardMaster));
    boardMasterService.updateBoardMaster(boardMasterDto);
    verify(boardMasterRepository).findById("BBS_0000000001");
  }

  @Test
@DisplayName("Board Master delete success")
  void deleteBoardMaster_success() {
    when(boardMasterRepository.findById("BBS_0000000001")).thenReturn(Optional.of(mockBoardMaster));
    boardMasterService.deleteBoardMaster("BBS_0000000001", "USER002");
    verify(boardMasterRepository).findById("BBS_0000000001");
  }

  @Test
@DisplayName("Satisfaction usage check success")
  void canUseSatisfaction_true() {
    when(boardMasterRepository.findById("BBS_0000000001")).thenReturn(Optional.of(mockBoardMaster));
    assertThat(boardMasterService.canUseSatisfaction("BBS_0000000001")).isTrue();
  }

  @Test
@DisplayName("Comment usage check success")
  void canUseComment_true() {
    when(boardMasterRepository.findById("BBS_0000000001")).thenReturn(Optional.of(mockBoardMaster));
    assertThat(boardMasterService.canUseComment("BBS_0000000001")).isTrue();
  }

  @Test
@DisplayName("Blog list success")
  void getBlogList_success() {
    Blog blog = Blog.builder().blogId("BLOG_001").blogNm("Blog").build();
    when(blogRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(blog)));
    Page<BlogDto> result = boardMasterService.getBlogList("1", "test", PageRequest.of(0, 10));
    assertThat(result).hasSize(1);
  }

  @Test
  @DisplayName("Blog detail success")
  void getBlog_success() {
    Blog blog = Blog.builder().blogId("BLOG_001").blogNm("Blog").build();
    when(blogRepository.findById("BLOG_001")).thenReturn(Optional.of(blog));
    
    BlogDto result = boardMasterService.getBlog("BLOG_001");
    
    assertThat(result).isNotNull();
    assertThat(result.getBlogId()).isEqualTo("BLOG_001");
  }

  @Test
  @DisplayName("Blog user check success")
  void checkBlogUser_success() {
    when(blogRepository.existsByCreatedBy("USER001")).thenReturn(true);
    
    boolean result = boardMasterService.checkBlogUser("USER001");
    
    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("Get blog list for portlet success")
  void getBlogListPortlet_success() {
    Blog blog = Blog.builder().blogId("BLOG_001").blogNm("Blog").build();
    when(blogRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(blog)));
    
    List<BlogDto> result = boardMasterService.getBlogListPortlet();
    
    assertThat(result).hasSize(1);
    assertThat(result.get(0).getBlogId()).isEqualTo("BLOG_001");
  }

  @Test
  @DisplayName("Get board master list for portlet success")
  void getBoardMasterListPortlet_success() {
    when(boardMasterRepository.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(mockBoardMaster)));
    
    List<BoardMasterDto> result = boardMasterService.getBoardMasterListPortlet();
    
    assertThat(result).hasSize(1);
    assertThat(result.get(0).getBbsId()).isEqualTo("BBS_0000000001");
  }

  @Test
  @DisplayName("Get board master list by community success")
  void getBoardMasterListByCommunity_success() {
    when(boardMasterRepository.findByCmmntyIdAndUseAt("COMM_001", "Y")).thenReturn(List.of(mockBoardMaster));
    
    List<BoardMasterDto> result = boardMasterService.getBoardMasterListByCommunity("COMM_001");
    
    assertThat(result).hasSize(1);
    assertThat(result.get(0).getBbsId()).isEqualTo("BBS_0000000001");
  }

  @Test
  @DisplayName("Blog create success")
  void createBlog_success() {
    boardMasterService.createBlog(BlogDto.builder().blogId("B1").build());
    verify(blogRepository).save(any(Blog.class));
  }

  @Test
  @DisplayName("Blog join success")
  void joinBlog_success() {
    boardMasterService.joinBlog("B1", "U1", "N");
    verify(blogUserRepository).save(any(BlogUser.class));
  }
}



