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
    BoardIdProperties ids;
    BoardService service;

    @BeforeEach void prepare() {
        ids = new BoardIdProperties();
        ids.setNoticeId("NOTICE");
        ids.setFaqId("NOTICE");
        service = new BoardService(posts, boards, users, files, attachments, events, new SimpleMeterRegistry(),
                views, new BoardMapperImpl(), ids, recommendations, communities);
    }
    @AfterEach void clear() { SecurityContextHolder.clearContext(); }

    private void authenticate(String... permissions) {
        var user = CustomUserDetails.builder().userId("editor").esntlId("editor-key").enabled(true)
                .permissions(List.of(permissions)).build();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
    }
    private BoardSaveRequest request(String board) {
        return new BoardSaveRequest(board, "제목", "내용", null, null, null, null, null, null, null, null, null);
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
