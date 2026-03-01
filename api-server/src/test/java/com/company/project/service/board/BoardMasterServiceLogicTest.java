package com.company.project.service.board;

import com.company.project.core.exception.BusinessException;
import com.company.project.core.exception.ErrorCode;
import com.company.project.domain.board.*;
import com.company.project.service.board.dto.BoardMasterDto;
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
import static org.mockito.Mockito.*;

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
                .bbsNm("?åÏä§??Í≤åÏãú??)
                .bbsIntrcn("Í≤åÏãú???åÍ∞ú")
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

        boardMasterDto = BoardMasterDto.builder()
                .bbsId("BBS_0000000001")
                .bbsNm("?åÏä§??Í≤åÏãú??)
                .bbsIntrcn("Í≤åÏãú???åÍ∞ú")
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
    @DisplayName("Í≤åÏãú??ÎßàÏä§???ùÏÑ± ?±Í≥µ")
    void createBoardMaster_success() throws Exception {
        // Given
        when(idgenService.getNextStringId()).thenReturn("BBS_NEW0000001");
        when(boardMasterRepository.save(any(BoardMaster.class))).thenAnswer(invocation -> invocation.getArgument(0));

        BoardMasterDto newBoardMasterDto = BoardMasterDto.builder()
                .bbsNm("?†Í∑ú Í≤åÏãú??)
                .bbsIntrcn("?†Í∑ú Í≤åÏãú???åÍ∞ú")
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
        assertThat(savedEntity.getBbsNm()).isEqualTo("?†Í∑ú Í≤åÏãú??);
        assertThat(savedEntity.getUseAt()).isEqualTo("Y"); // Default value
        assertThat(savedEntity.getFrstRegisterId()).isEqualTo("USER001");
    }

    @Test
    @DisplayName("Í≤åÏãú??ÎßàÏä§???ùÏÑ± ?§Ìå® - ID ?ùÏÑ± ?§Î•ò")
    void createBoardMaster_fail_idGeneration() throws Exception {
        // Given
        when(idgenService.getNextStringId()).thenThrow(new Exception("ID generation failed"));

        // When & Then
        assertThatThrownBy(() -> boardMasterService.createBoardMaster(boardMasterDto))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Failed to generate ID");
    }

    @Test
    @DisplayName("Í≤åÏãú??ÎßàÏä§???òÏ†ï ?±Í≥µ")
    void updateBoardMaster_success() {
        // Given
        when(boardMasterRepository.findById("BBS_0000000001")).thenReturn(Optional.of(mockBoardMaster));

        BoardMasterDto updateDto = BoardMasterDto.builder()
                .bbsId("BBS_0000000001")
                .bbsNm("?òÏ†ï??Í≤åÏãú??)
                .bbsIntrcn("?òÏ†ï???åÍ∞ú")
                .lastUpdusrId("USER002")
                .build();

        // When
        boardMasterService.updateBoardMaster(updateDto);

        // Then
        verify(boardMasterRepository).findById("BBS_0000000001");
        assertThat(mockBoardMaster.getBbsNm()).isEqualTo("?òÏ†ï??Í≤åÏãú??);
        assertThat(mockBoardMaster.getBbsIntrcn()).isEqualTo("?òÏ†ï???åÍ∞ú");
    }

    @Test
    @DisplayName("Í≤åÏãú??ÎßàÏä§???òÏ†ï ?§Ìå® - Ï°¥Ïû¨?òÏ? ?äÎäî ID")
    void updateBoardMaster_fail_notFound() {
        // Given
        when(boardMasterRepository.findById("NONEXISTENT")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> boardMasterService.updateBoardMaster(boardMasterDto))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("Í≤åÏãú??ÎßàÏä§????†ú ?±Í≥µ")
    void deleteBoardMaster_success() {
        // Given
        when(boardMasterRepository.findById("BBS_0000000001")).thenReturn(Optional.of(mockBoardMaster));

        // When
        boardMasterService.deleteBoardMaster("BBS_0000000001", "USER002");

        // Then
        verify(boardMasterRepository).findById("BBS_0000000001");
        // Verify that the delete method was called on the entity
    }

    @Test
    @DisplayName("Í≤åÏãú??ÎßàÏä§????†ú ?§Ìå® - Ï°¥Ïû¨?òÏ? ?äÎäî ID")
    void deleteBoardMaster_fail_notFound() {
        // Given
        when(boardMasterRepository.findById("NONEXISTENT")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> boardMasterService.deleteBoardMaster("NONEXISTENT", "USER002"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
    }

    @Test
    @DisplayName("ÎßåÏ°±???¨Ïö© Í∞Ä???¨Î? ?ïÏù∏ - ?¨Ïö© Í∞Ä??)
    void canUseSatisfaction_true() {
        // Given
        when(boardMasterRepository.findById("BBS_0000000001")).thenReturn(Optional.of(mockBoardMaster));

        // When
        boolean result = boardMasterService.canUseSatisfaction("BBS_0000000001");

        // Then
        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("ÎßåÏ°±???¨Ïö© Í∞Ä???¨Î? ?ïÏù∏ - ?¨Ïö© Î∂àÍ?")
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
    @DisplayName("?ìÍ? ?¨Ïö© Í∞Ä???¨Î? ?ïÏù∏ - Ï°¥Ïû¨?òÏ? ?äÎäî Í≤åÏãú??)
    void canUseComment_boardNotFound() {
        // Given
        when(boardMasterRepository.findById("NONEXISTENT")).thenReturn(Optional.empty());

        // When
        boolean result = boardMasterService.canUseComment("NONEXISTENT");

        // Then
        assertThat(result).isFalse();
    }

    @Test
    @DisplayName("?ìÍ? ?¨Ïö© Í∞Ä???¨Î? ?ïÏù∏ - ?¨Ïö© Í∞Ä??)
    void canUseComment_true() {
        // Given
        when(boardMasterRepository.findById("BBS_0000000001")).thenReturn(Optional.of(mockBoardMaster));

        // When
        boolean result = boardMasterService.canUseComment("BBS_0000000001");

        // Then
        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("Í≤åÏãú??ÎßàÏä§??Î™©Î°ù Ï°∞Ìöå ?±Í≥µ")
    void getBoardMasterList_success() {
        // Given
        List<BoardMasterSearchResult> searchResults = Arrays.asList(
                BoardMasterSearchResult.builder()
                        .bbsId("BBS_0000000001")
                        .bbsNm("?åÏä§??Í≤åÏãú??")
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
        assertThat(result.getContent().get(0).getBbsNm()).isEqualTo("?åÏä§??Í≤åÏãú??");
    }

    @Test
    @DisplayName("Í≤åÏãú??ÎßàÏä§??Ï°∞Ìöå ?±Í≥µ")
    void getBoardMaster_success() {
        // Given
        when(boardMasterRepository.findById("BBS_0000000001")).thenReturn(Optional.of(mockBoardMaster));

        // When
        BoardMasterDto result = boardMasterService.getBoardMaster("BBS_0000000001");

        // Then
        assertThat(result.getBbsId()).isEqualTo("BBS_0000000001");
        assertThat(result.getBbsNm()).isEqualTo("?åÏä§??Í≤åÏãú??);
        assertThat(result.getUseAt()).isEqualTo("Y");
    }

    @Test
    @DisplayName("Í≤åÏãú??ÎßàÏä§??Ï°∞Ìöå ?§Ìå® - Ï°¥Ïû¨?òÏ? ?äÎäî ID")
    void getBoardMaster_fail_notFound() {
        // Given
        when(boardMasterRepository.findById("NONEXISTENT")).thenReturn(Optional.empty());

        // When & Then
        assertThatThrownBy(() -> boardMasterService.getBoardMaster("NONEXISTENT"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.RESOURCE_NOT_FOUND);
    }
}
