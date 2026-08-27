package nuri.business.service.comment;

import nuri.business.domain.comment.Comment;
import nuri.business.domain.comment.CommentRepository;
import nuri.business.service.comment.dto.CommentDto;
import nuri.foundation.core.exception.BusinessException;
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

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    private org.mockito.MockedStatic<nuri.business.security.util.SecurityUtil> __secUtilMock;
    @org.junit.jupiter.api.BeforeEach
    void __openSecUtilMock() { __secUtilMock = org.mockito.Mockito.mockStatic(nuri.business.security.util.SecurityUtil.class); }
    @org.junit.jupiter.api.AfterEach
    void __closeSecUtilMock() { if (__secUtilMock != null) __secUtilMock.close(); }

    @InjectMocks
    private CommentService commentService;

    @Mock
    private CommentRepository commentRepository;

    @Test
    @DisplayName("Get comments list")
    void getComments() {
        // given
        Long pstSn = 1L;
        String bbsId = "BBS_01";
        Pageable pageable = PageRequest.of(0, 10);
        Comment comment = Comment.builder()
                .ansSn(1L)
                .pstSn(pstSn)
                .bbsId(bbsId)
                .ansCn("Test Comment")
                .useYn("Y")
                .build();
        comment.setCrtDt(LocalDateTime.now());
        Page<Comment> page = new PageImpl<>(Collections.singletonList(comment));

        given(commentRepository.findByBbsIdAndPstSn(bbsId, pstSn, pageable)).willReturn(page);

        // when
        Page<CommentDto> result = commentService.getComments(pstSn, bbsId, pageable);

        // then
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getAnsCn()).isEqualTo("Test Comment");
    }

    @Test
    @DisplayName("Create comment")
    void createComment() {
        // given
        CommentDto request = CommentDto.builder()
                .pstSn(1L)
                .bbsId("BBS_01")
                .wrterId("user1")
                .wrterNm("Tester")
                .pswd("1234")
                .ansCn("New Comment")
                .build();
        Comment savedComment = Comment.builder()
                .ansSn(1L)
                .pstSn(request.getPstSn())
                .bbsId(request.getBbsId())
                .wrterId(request.getWrterId())
                .wrterNm(request.getWrterNm())
                .ansCn(request.getAnsCn())
                .build();

        given(commentRepository.save(any(Comment.class))).willReturn(savedComment);

        // when
        Long id = commentService.createComment("USRCNFRM_00000000001", "홍길동", request);

        // then
        assertThat(id).isEqualTo(1L);
    }

    @Test
    @DisplayName("작성자는 인증 주체에서 저장한다 — 요청 본문의 주장은 무시된다")
    void createComment_storesAuthenticatedAuthorOnly() {
        // 종전에는 request 의 wrterId/wrterNm 을 그대로 저장했다. 화면이 그 두 필드를 보내지 않으므로
        // **모든 댓글의 작성자가 null** 이었고, 요청이 값을 실으면 남의 이름으로 다는 것도 가능했다.
        CommentDto request = CommentDto.builder()
                .pstSn(1L)
                .bbsId("BBS_01")
                .wrterId("SPOOFED_ID")
                .wrterNm("남의이름")
                .ansCn("New Comment")
                .build();
        given(commentRepository.save(any(Comment.class)))
                .willReturn(Comment.builder().ansSn(9L).build());

        commentService.createComment("USRCNFRM_00000000001", "홍길동", request);

        org.mockito.ArgumentCaptor<Comment> saved = org.mockito.ArgumentCaptor.forClass(Comment.class);
        verify(commentRepository).save(saved.capture());
        assertThat(saved.getValue().getWrterId()).isEqualTo("USRCNFRM_00000000001");
        assertThat(saved.getValue().getWrterNm()).isEqualTo("홍길동");
    }

    @Test
    @DisplayName("Update comment")
    void updateComment() {
        // given
        Long id = 1L;
        String newContent = "Updated Comment";
        Comment comment = Comment.builder()
                .ansSn(id)
                .ansCn("Old Comment")
                .build();

        given(commentRepository.findById(id)).willReturn(Optional.of(comment));

        // when
        commentService.updateComment(id, newContent);

        // then
        assertThat(comment.getAnsCn()).isEqualTo(newContent);
    }

    @Test
    @DisplayName("Update comment should throw exception when not found")
    void updateComment_NotFound() {
        // given
        Long id = 1L;
        given(commentRepository.findById(id)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> commentService.updateComment(id, "Updated Comment"))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("Delete comment")
    void deleteComment() {
        // given
        Long id = 1L;
        Comment comment = Comment.builder()
                .ansSn(id)
                .useYn("Y")
                .build();

        given(commentRepository.findById(id)).willReturn(Optional.of(comment));

        // when
        commentService.deleteComment(id);

        // then
        assertThat(comment.getUseYn()).isEqualTo("N");
    }

    @Test
    @DisplayName("Delete comment should throw exception when not found")
    void deleteComment_NotFound() {
        // given
        Long id = 1L;
        given(commentRepository.findById(id)).willReturn(Optional.empty());

        // when & then
        assertThatThrownBy(() -> commentService.deleteComment(id))
                .isInstanceOf(BusinessException.class);
    }
}
