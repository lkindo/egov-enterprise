package nuri.business.service.board;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import nuri.business.core.config.BoardIdProperties;
import nuri.business.domain.board.*;
import nuri.business.domain.board.exception.BoardErrorCode;
import nuri.business.service.board.dto.BoardMapperImpl;
import nuri.business.service.board.dto.BoardSaveRequest;
import nuri.business.service.file.AttachmentAssignmentPolicy;
import nuri.business.service.file.FileService;
import nuri.business.service.user.UserService;
import nuri.foundation.core.community.CommunityBoardAccessPort;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.core.exception.CommonErrorCode;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConfiguredBoardEditPolicyTest {
    @Mock BoardRepository posts;
    @Mock BoardMasterRepository boards;
    @Mock UserService users;
    @Mock FileService files;
    @Mock AttachmentAssignmentPolicy attachments;
    @Mock ApplicationEventPublisher events;
    @Mock BoardViewCountService views;
    @Mock BoardRecommendationRepository recommendations;
    @Mock CommunityBoardAccessPort communities;
    @Mock BoardChangeRecorder changes;
    BoardIdProperties ids;
    BoardService service;

    @BeforeEach void prepare() {
        ids = new BoardIdProperties();
        ids.setNoticeId("NOTICE");
        ids.setFaqId("NOTICE");
        service = new BoardService(posts, boards, users, files, attachments, events, new SimpleMeterRegistry(),
                views, new BoardMapperImpl(), ids, recommendations, changes, communities);
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    private void authenticate(String... permissions) {
        var user = CustomUserDetails.builder().userId("editor").esntlId("editor-key").enabled(true)
                .permissions(List.of(permissions)).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }
    private BoardSaveRequest request(String board) {
        return new BoardSaveRequest(board, "제목", "내용", null, null, null, null, null, null, null, null, null, null);
    }

    @ParameterizedTest
    @ValueSource(strings = {"BOARD_CREATE", "NOTICE_EDIT", "FAQ_EDIT"})
    void missingEitherRequiredPermissionRejectsEveryWriteBeforeReadingOrUploading(String permission) {
        authenticate(permission);
        var upload = List.<org.springframework.web.multipart.MultipartFile>of(new MockMultipartFile("files", "f.txt", "text/plain", new byte[]{1}));
        List<org.assertj.core.api.ThrowableAssert.ThrowingCallable> actions = List.of(
                () -> service.createPost("editor-key", request("NOTICE")),
                () -> service.createPostWithFiles("editor-key", request("NOTICE"), upload),
                () -> service.replyPost("editor-key", 1L, request("NOTICE")),
                () -> service.replyPostWithFiles("editor-key", 1L, request("NOTICE"), upload),
                () -> service.updatePost("NOTICE", 1L, request("ordinary")),
                () -> service.updatePostWithFiles("NOTICE", 1L, request("ordinary"), upload),
                () -> service.deletePost("NOTICE", 1L, "editor-key"),
                () -> service.markQuestionSolved("NOTICE", 1L));
        actions.forEach(action -> assertThatThrownBy(action).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED));
        verifyNoInteractions(posts, boards, users, files, attachments, events);
    }

    /**
     * [2026-10-23 ADR-0040 §6 B1] 운영 화면의 게시 기간 변경(단건·일괄)은 게시글 전체 수정 권한(BOARD_UPDATE_ALL)에 더해 지정 게시판의
     * 두 편집 권한을 모두 요구한다. 어느 하나가 빠지면 글을 읽거나 이력을 남기기 전에 403 이다.
     */
    @ParameterizedTest
    @ValueSource(strings = {"BOARD_UPDATE_ALL", "NOTICE_EDIT", "FAQ_EDIT"})
    void operatorPeriodWritesNeedUpdateAllAndBothDesignatedEditPermissions(String missing) {
        authenticate(List.of("BOARD_UPDATE_ALL", "NOTICE_EDIT", "FAQ_EDIT").stream()
                .filter(permission -> !permission.equals(missing)).toArray(String[]::new));
        List<org.assertj.core.api.ThrowableAssert.ThrowingCallable> actions = List.of(
                () -> service.updatePostPeriod("NOTICE", 1L,
                        new nuri.business.service.board.dto.BoardPostPeriodRequest(null, "20991231", 0)),
                () -> service.updatePostPeriodsInBatch("NOTICE",
                        new nuri.business.service.board.dto.BoardPostPeriodBatchRequest("END_DATE", List.of(1L), "20991231")));
        actions.forEach(action -> assertThatThrownBy(action).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED));
        verifyNoInteractions(posts, boards, changes);
    }

    /**
     * [2026-10-23 ADR-0040 §6 B2] 운영 화면의 상단 고정·해제(단건·일괄)는 게시글 상단 고정 권한(BOARD_PIN)에 더해 지정 게시판의 두
     * 편집 권한을 모두 요구한다. 어느 하나가 빠지면 마스터를 잠그거나 글을 읽기 전에 403 이다.
     */
    @ParameterizedTest
    @ValueSource(strings = {"BOARD_PIN", "NOTICE_EDIT", "FAQ_EDIT"})
    void pinWritesNeedBoardPinAndBothDesignatedEditPermissions(String missing) {
        authenticate(List.of("BOARD_PIN", "NOTICE_EDIT", "FAQ_EDIT").stream()
                .filter(permission -> !permission.equals(missing)).toArray(String[]::new));
        List<org.assertj.core.api.ThrowableAssert.ThrowingCallable> actions = List.of(
                () -> service.updatePostPin("NOTICE", 1L, new nuri.business.service.board.dto.BoardPostPinRequest("Y", null)),
                () -> service.updatePostPinsInBatch("NOTICE",
                        new nuri.business.service.board.dto.BoardPostPinBatchRequest(List.of(1L), "N", null)));
        actions.forEach(action -> assertThatThrownBy(action).isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED));
        verifyNoInteractions(posts, boards, changes);
    }

    @Test void pinOnDesignatedBoardPassesWithBoardPinAndBothEditPermissions() {
        authenticate("BOARD_PIN", "NOTICE_EDIT", "FAQ_EDIT");
        when(boards.findByIdWithPessimisticLock("NOTICE")).thenReturn(Optional.of(
                BoardMaster.builder().bbsId("NOTICE").upendFixPsbltyYn("Y").build()));
        when(posts.findById(1L)).thenReturn(Optional.of(Board.builder().bbsId("NOTICE").pstSn(1L).build()));
        when(posts.countActivePins(eq("NOTICE"), anyString())).thenReturn(0L);
        when(posts.updatePin(eq("NOTICE"), eq(List.of(1L)), eq("Y"), anyString())).thenReturn(1);

        service.updatePostPin("NOTICE", 1L, new nuri.business.service.board.dto.BoardPostPinRequest("Y", null));

        verify(posts).updatePin(eq("NOTICE"), eq(List.of(1L)), eq("Y"), anyString());
    }

    @Test void metadataUsesConfiguredIdsAndRequiresBothWhenTheyCoincide() {
        when(boards.findById(anyString())).thenAnswer(call -> Optional.of(BoardMaster.builder().bbsId(call.getArgument(0)).build()));
        assertThat(service.getBoardMeta("NOTICE").requiredEditPermissions()).containsExactly("NOTICE_EDIT", "FAQ_EDIT");
        assertThat(service.getBoardMeta("ordinary").requiredEditPermissions()).isEmpty();
        ids.setFaqId("FAQ");
        assertThat(service.getBoardMeta("NOTICE").requiredEditPermissions()).containsExactly("NOTICE_EDIT");
        assertThat(service.getBoardMeta("FAQ").requiredEditPermissions()).containsExactly("FAQ_EDIT");
    }

    @Test void editorPermissionsDoNotOverrideOwnershipOrCommunityMembership() {
        authenticate("NOTICE_EDIT", "FAQ_EDIT", "BOARD_UPDATE");
        // [2026-10-23 ADR-0040 결정 1] 쓰기는 게시판 진입 판정(사용 여부·커뮤니티)을 지난 뒤 소유를 본다.
        when(boards.findById("NOTICE")).thenReturn(Optional.of(BoardMaster.builder().bbsId("NOTICE").build()));
        when(posts.findById(1L)).thenReturn(Optional.of(Board.builder().bbsId("NOTICE").pstSn(1L).userId("other").build()));
        assertThatThrownBy(() -> service.updatePost("NOTICE", 1L, request("NOTICE")))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        when(boards.findById("NOTICE")).thenReturn(Optional.of(BoardMaster.builder().bbsId("NOTICE").cmntySn(5L).build()));
        assertThatThrownBy(() -> service.deletePost("NOTICE", 1L, "editor-key"))
                .isInstanceOf(BusinessException.class).hasMessageContaining("커뮤니티 회원");
        verifyNoInteractions(files, attachments);
    }

    @Test void ordinaryBoardWritingStillWorksWithoutSpecialPermissions() {
        authenticate("BOARD_CREATE");
        when(boards.findByIdWithPessimisticLock("ordinary")).thenReturn(Optional.of(BoardMaster.builder().bbsId("ordinary").build()));
        when(posts.save(any())).thenReturn(Board.builder().pstSn(8L).build());
        assertThat(service.createPost("editor-key", request("ordinary"))).isEqualTo(8L);
    }

    @Test void replyCannotSwitchBoardIdsOrReadSecretParentsBeforeUpload() {
        authenticate("NOTICE_EDIT", "FAQ_EDIT", "BOARD_CREATE");
        when(boards.findById("ordinary")).thenReturn(Optional.of(BoardMaster.builder().bbsId("ordinary").build()));
        when(boards.findById("NOTICE")).thenReturn(Optional.of(BoardMaster.builder().bbsId("NOTICE").build()));
        when(posts.findById(1L)).thenReturn(Optional.of(Board.builder().bbsId("NOTICE").pstSn(1L).build()));
        assertThatThrownBy(() -> service.replyPostWithFiles("editor-key", 1L, request("ordinary"), List.of()))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);
        when(posts.findById(1L)).thenReturn(Optional.of(Board.builder().bbsId("NOTICE").pstSn(1L).scrtYn("Y").userId("other").build()));
        assertThatThrownBy(() -> service.replyPostWithFiles("editor-key", 1L, request("NOTICE"), List.of()))
                .isInstanceOf(BusinessException.class).hasFieldOrPropertyWithValue("errorCode", CommonErrorCode.ACCESS_DENIED);
        verifyNoInteractions(files, attachments);
        verify(posts, never()).save(any());
    }
}
