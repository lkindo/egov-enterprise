package com.company.project.business.service.board;

import com.company.project.foundation.core.exception.BusinessException;
import com.company.project.foundation.core.exception.ErrorCode;
import com.company.project.business.domain.board.*;
import com.company.project.business.service.board.dto.BoardMasterDto;
import org.egovframe.rte.fdl.idgnr.EgovIdGnrService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@org.junit.jupiter.api.Disabled
@ExtendWith(MockitoExtension.class)
class BoardMasterServiceLogicTest {

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
        .bbsNm("사용자게시판")
        .bbsIntrcn("게시판성공")
        .bbsTyCode("BBST01")
        .bbsAttrbCode("BBSA01")
        .replyPosblAt("Y")
        .fileAtchPosblAt("Y")
        .atchPosblFileNumber(3)
        .atchPosblFileSize(1024L * 1024L * 5L) // 5MB
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
        .bbsNm("사용자게시판")
        .bbsIntrcn("게시판성공")
        .bbsTyCode("BBST01")
        .bbsAttrbCode("BBSA01")
        .replyPosblAt("Y")
        .fileAtchPosblAt("Y")
        .atchPosblFileNumber(3)
        .atchPosblFileSize(1024L * 1024L * 5L) // 5MB
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
  @DisplayName("게시판 생성 성공")
  void createBoardMaster_success() throws Exception {
    // Given
    when(idgenService.getNextStringId()).thenReturn("BBS_NEW0000001");
    when(boardMasterRepository.save(any(BoardMaster.class))).thenAnswer(invocation -> invocation.getArgument(0));

    BoardMasterDto newBoardMasterDto = BoardMasterDto.builder()
        .bbsNm("신규 게시판")
        .bbsIntrcn("신규 게시판성공")
        .bbsTyCode("BBST01")
        .bbsAttrbCode("BBSA01")
        .replyPosblAt("Y")
        .fileAtchPosblAt("Y")
        .atchPosblFileNumber(3)
        .atchPosblFileSize(1024L * 1024L * 5L)
        .tmplatId("TMPL01")
        .frstRegisterId("USER001")
        .build();

    // When
    boardMasterService.createBoardMaster(newBoardMasterDto);

    // Then
    ArgumentCaptor<BoardMaster> captor = ArgumentCaptor.forClass(BoardMaster.class);
    verify(boardMasterRepository).save(captor.capture());

    BoardMaster savedEntity = captor.getValue();
    assertThat(savedEntity.getBbsId()).isEqualTo("BBS_NEW0000001");
    assertThat(savedEntity.getBbsNm()).isEqualTo("신규 게시판");
    assertThat(savedEntity.getUseAt()).isEqualTo("Y"); // Default value
    assertThat(savedEntity.getCreatedBy()).isEqualTo("USER001");
  }

  @Test
  @DisplayName("게시판 생성 실패 - ID 생성 오류")
  void createBoardMaster_fail_idGeneration() throws Exception {
    // Given
    when(idgenService.getNextStringId()).thenThrow(new Exception("ID generation failed"));

    // When & Then
    assertThatThrownBy(() -> boardMasterService.createBoardMaster(boardMasterDto))
        .isInstanceOf(BusinessException.class)
        .hasMessageContaining("Failed to generate ID");
  }

  @Test
  @DisplayName("게시판 수정 성공")
  void updateBoardMaster_success() {
    // Given
    when(boardMasterRepository.findById("BBS_0000000001")).thenReturn(Optional.of(mockBoardMaster));

    BoardMasterDto updateDto = BoardMasterDto.builder()
        .bbsId("BBS_0000000001")
        .bbsNm("사용자게시판")
        .bbsIntrcn("사용자성공")
        .lastUpdusrId("USER002")
        .build();

    // When
    boardMasterService.updateBoardMaster(updateDto);

    // Then
    verify(boardMasterRepository).findById("BBS_0000000001");
    assertThat(mockBoardMaster.getBbsNm()).isEqualTo("사용자게시판");
    assertThat(mockBoardMaster.getBbsIntrcn()).isEqualTo("사용자성공");
  }

  @Test
  @DisplayName("게시판 수정 실패 - 존재하지 않는 ID")
  void updateBoardMaster_fail_notFound() {
    // Given
    when(boardMasterRepository.findById("NONEXISTENT")).thenReturn(Optional.empty());

    // When & Then
    assertThatThrownBy(() -> boardMasterService.updateBoardMaster(boardMasterDto))
        .isInstanceOf(BusinessException.class)
        .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
  }

  @Test
  @DisplayName("게시판 삭제 성공")
  void deleteBoardMaster_success() {
    // Given
    when(boardMasterRepository.findById("BBS_0000000001")).thenReturn(Optional.of(mockBoardMaster));

    // When
    boardMasterService.deleteBoardMaster("BBS_0000000001", "USER002");

    // Then
    verify(boardMasterRepository).findById("BBS_0000000001");
  }

  @Test
  @DisplayName("게시판 삭제 실패 - 존재하지 않는 ID")
  void deleteBoardMaster_fail_notFound() {
    // Given
    when(boardMasterRepository.findById("NONEXISTENT")).thenReturn(Optional.empty());

    // When & Then
    assertThatThrownBy(() -> boardMasterService.deleteBoardMaster("NONEXISTENT", "USER002"))
        .isInstanceOf(BusinessException.class)
        .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
  }

  @Test
  @DisplayName("만족도 조사 사용 가능 여부 확인 - 사용 가능")
  void canUseSatisfaction_true() {
    // Given
    when(boardMasterRepository.findById("BBS_0000000001")).thenReturn(Optional.of(mockBoardMaster));

    // When
    boolean result = boardMasterService.canUseSatisfaction("BBS_0000000001");

    // Then
    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("만족도 조사 사용 가능 여부 확인 - 사용 불가")
  void canUseSatisfaction_false() {
    // Given
    BoardMaster inactiveBoard = BoardMaster.builder()
        .bbsId("BBS_0000000002")
        .stsfdgAt("N") // Not enabled
        .build();
    when(boardMasterRepository.findById("BBS_0000000002")).thenReturn(Optional.of(inactiveBoard));

    // When
    boolean result = boardMasterService.canUseSatisfaction("BBS_0000000002");

    // Then
    assertThat(result).isFalse();
  }

  @Test
  @DisplayName("댓글 사용 가능 여부 확인 - 게시판 없음")
  void canUseComment_boardNotFound() {
    // Given
    when(boardMasterRepository.findById("NONEXISTENT")).thenReturn(Optional.empty());

    // When
    boolean result = boardMasterService.canUseComment("NONEXISTENT");

    // Then
    assertThat(result).isFalse();
  }

  @Test
  @DisplayName("댓글 사용 가능 여부 확인 - 사용 가능")
  void canUseComment_true() {
    // Given
    when(boardMasterRepository.findById("BBS_0000000001")).thenReturn(Optional.of(mockBoardMaster));

    // When
    boolean result = boardMasterService.canUseComment("BBS_0000000001");

    // Then
    assertThat(result).isTrue();
  }

  @Test
  @DisplayName("게시판 목록 조회 성공")
  void getBoardMasterList_success() {
    // Given
    List<BoardMasterSearchResult> searchResults = Arrays.asList(
        BoardMasterSearchResult.builder()
            .bbsId("BBS_0000000001")
            .bbsNm("사용자게시판")
            .bbsTyCode("BBST01")
            .bbsAttrbCode("BBSA01")
            .tmplatId("TMPL01")
            .useAt("Y")
            .build());
    Page<BoardMasterSearchResult> searchResultPage = new PageImpl<>(searchResults);
    Pageable pageable = PageRequest.of(0, 10);

    when(boardMasterRepository.searchBoardMasters(any(BoardMasterSearchCondition.class), eq(pageable)))
        .thenReturn(searchResultPage);

    // When
    Page<BoardMasterDto> result = boardMasterService.getBoardMasterList("1", "test", pageable);

    // Then
    assertThat(result).hasSize(1);
    assertThat(result.getContent().get(0).getBbsId()).isEqualTo("BBS_0000000001");
    assertThat(result.getContent().get(0).getBbsNm()).isEqualTo("사용자게시판");
  }

  @Test
  @DisplayName("게시판 정보 조회 성공")
  void getBoardMaster_success() {
    // Given
    when(boardMasterRepository.findById("BBS_0000000001")).thenReturn(Optional.of(mockBoardMaster));

    // When
    BoardMasterDto result = boardMasterService.getBoardMaster("BBS_0000000001");

    // Then
    assertThat(result.getBbsId()).isEqualTo("BBS_0000000001");
    assertThat(result.getBbsNm()).isEqualTo("사용자게시판");
    assertThat(result.getUseAt()).isEqualTo("Y");
  }

  @Test
  @DisplayName("게시판 정보 조회 실패 - 존재하지 않는 ID")
  void getBoardMaster_fail_notFound() {
    // Given
    when(boardMasterRepository.findById("NONEXISTENT")).thenReturn(Optional.empty());

    // When & Then
    assertThatThrownBy(() -> boardMasterService.getBoardMaster("NONEXISTENT"))
        .isInstanceOf(BusinessException.class)
        .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
  }
}
