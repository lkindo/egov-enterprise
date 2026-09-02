package nuri.business.service.comment;

import nuri.business.TestApplication;
import nuri.business.core.config.TestMessagingConfig;
import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.board.BoardRepository;
import nuri.business.domain.board.exception.BoardErrorCode;
import nuri.business.domain.comment.Comment;
import nuri.business.domain.comment.CommentRepository;
import nuri.business.domain.comment.exception.CommentErrorCode;
import nuri.business.security.annotation.WithMockCustomUser;
import nuri.business.security.config.TestSecurityConfig;
import nuri.business.service.comment.dto.CommentDto;
import nuri.foundation.core.event.PostCommentCountChangedEvent;
import nuri.foundation.core.exception.BusinessException;
import nuri.foundation.security.service.CustomUserDetails;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest(classes = TestApplication.class)
@Import({
        TestSecurityConfig.class,
        TestMessagingConfig.class,
        CommentCountTransactionIntegrationTest.TestEventConfig.class
})
@ActiveProfiles("test")
@WithMockCustomUser(username = "comment-admin", esntlId = "ESNTL_COMMENT_ADMIN", role = "ADMIN")
@DisplayName("댓글 수 이벤트 트랜잭션 통합 테스트")
class CommentCountTransactionIntegrationTest {

    private static final String ACTOR_LOGIN_ID = "comment-admin";

    @Autowired
    private CommentService commentService;

    @Autowired
    private CommentRepository commentRepository;

    @Autowired
    private BoardRepository boardRepository;

    @Autowired
    private BoardMasterRepository boardMasterRepository;

    @Autowired
    private FailBeforeCommitListener failBeforeCommitListener;

    private String bbsId;
    private String otherBbsId;
    private Long pstSn;
    private ExecutorService executor;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        bbsId = "CC_" + suffix;
        otherBbsId = "CO_" + suffix;

        boardMasterRepository.saveAndFlush(newBoardMaster(bbsId));
        boardMasterRepository.saveAndFlush(newBoardMaster(otherBbsId));
        pstSn = boardRepository.saveAndFlush(Board.builder()
                .bbsId(bbsId)
                .pstTtl("Comment transaction post")
                .pstCn("body")
                .userId("ESNTL_COMMENT_ADMIN")
                .userNm("Comment Admin")
                .useYn("Y")
                .cmntCnt(0)
                .build()).getPstSn();

        executor = Executors.newFixedThreadPool(2);
        failBeforeCommitListener.reset();
    }

    @AfterEach
    void tearDown() {
        failBeforeCommitListener.reset();
        if (executor != null) {
            executor.shutdownNow();
        }
    }

    @Test
    @DisplayName("같은 댓글의 동시 삭제는 실제 상태 전이 한 번만 댓글 수에서 뺀다")
    void concurrentDeleteOfSameCommentPublishesSingleDecrement() throws InterruptedException {
        Comment target = saveComment("delete target");
        saveComment("still active");
        boardRepository.adjustCmntCntAtomic(bbsId, pstSn, 1);
        boardRepository.adjustCmntCntAtomic(bbsId, pstSn, 1);

        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        CountDownLatch done = new CountDownLatch(2);
        ConcurrentLinkedQueue<Throwable> failures = new ConcurrentLinkedQueue<>();
        AtomicInteger successes = new AtomicInteger();

        for (int i = 0; i < 2; i++) {
            executor.submit(() -> {
                installAdminSecurityContext();
                ready.countDown();
                try {
                    start.await();
                    commentService.deleteComment(target.getAnsSn());
                    successes.incrementAndGet();
                } catch (Throwable failure) {
                    failures.add(failure);
                } finally {
                    SecurityContextHolder.clearContext();
                    done.countDown();
                }
            });
        }

        assertThat(ready.await(5, TimeUnit.SECONDS)).isTrue();
        start.countDown();
        assertThat(done.await(15, TimeUnit.SECONDS)).isTrue();
        assertThat(successes).hasValue(1);
        assertThat(failures).hasSize(1);
        Throwable rejectedDelete = failures.peek();
        assertThat(rejectedDelete).isInstanceOf(BusinessException.class);
        assertThat(((BusinessException) rejectedDelete).getErrorCode())
                .isEqualTo(CommentErrorCode.COMMENT_NOT_FOUND);
        assertThat(commentRepository.countByBbsIdAndPstSnAndUseYn(bbsId, pstSn, "Y")).isEqualTo(1);
        assertThat(boardRepository.findById(pstSn).orElseThrow().getCmntCnt()).isEqualTo(1);
    }

    @Test
    @DisplayName("게시판 ID와 게시글 번호가 어긋난 댓글 등록은 댓글까지 되돌린다")
    void mismatchedBoardAndPostRollsBackComment() {
        CommentDto request = CommentDto.builder()
                .bbsId(otherBbsId)
                .pstSn(pstSn)
                .ansCn("must roll back")
                .build();

        assertThatThrownBy(() -> commentService.createComment(
                "ESNTL_COMMENT_ADMIN", "Comment Admin", request))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", BoardErrorCode.ARTICLE_NOT_FOUND);

        assertThat(commentRepository.countByBbsIdAndPstSnAndUseYn(otherBbsId, pstSn, "Y")).isZero();
        assertThat(boardRepository.findById(pstSn).orElseThrow().getCmntCnt()).isZero();
    }

    @Test
    @DisplayName("동기 이벤트 소비자가 commit 직전에 실패하면 댓글과 count를 함께 되돌린다")
    void listenerFailureRollsBackCommentAndCount() {
        failBeforeCommitListener.failNextEvent();

        assertThatThrownBy(() -> commentService.createComment(
                "ESNTL_COMMENT_ADMIN", "Comment Admin", validRequest("roll back together")))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("forced comment-count listener failure");

        assertThat(commentRepository.countByBbsIdAndPstSnAndUseYn(bbsId, pstSn, "Y")).isZero();
        assertThat(boardRepository.findById(pstSn).orElseThrow().getCmntCnt()).isZero();
    }

    @Test
    @DisplayName("댓글 수 갱신 성공은 게시글 version과 감사 필드를 바꾸지 않는다")
    void successfulCountUpdatePreservesBoardVersionAndAudit() {
        Board before = boardRepository.findById(pstSn).orElseThrow();
        assertThat(before.getLastMdfrId()).isEqualTo(ACTOR_LOGIN_ID);

        commentService.createComment(
                "ESNTL_COMMENT_ADMIN", "Comment Admin", validRequest("success"));

        Board after = boardRepository.findById(pstSn).orElseThrow();
        assertThat(after.getCmntCnt()).isEqualTo(1);
        assertThat(after.getVersion()).isEqualTo(before.getVersion());
        assertThat(after.getFrstRgtrId()).isEqualTo(before.getFrstRgtrId());
        assertThat(after.getLastMdfrId()).isEqualTo(before.getLastMdfrId());
        assertThat(after.getCrtDt()).isEqualTo(before.getCrtDt());
        assertThat(after.getMdfcnDt()).isEqualTo(before.getMdfcnDt());
    }

    private Comment saveComment(String content) {
        return commentRepository.saveAndFlush(Comment.builder()
                .bbsId(bbsId)
                .pstSn(pstSn)
                .wrterId("ESNTL_COMMENT_ADMIN")
                .wrterNm("Comment Admin")
                .ansCn(content)
                .useYn("Y")
                .build());
    }

    private CommentDto validRequest(String content) {
        return CommentDto.builder().bbsId(bbsId).pstSn(pstSn).ansCn(content).build();
    }

    private static BoardMaster newBoardMaster(String id) {
        return BoardMaster.builder()
                .bbsId(id)
                .bbsTtl("Comment transaction board")
                .bbsTypeCd("COM004")
                .bbsAtrbCd("COM009")
                .useYn("Y")
                .build();
    }

    private static void installAdminSecurityContext() {
        CustomUserDetails principal = CustomUserDetails.builder()
                .userId(ACTOR_LOGIN_ID)
                .esntlId("ESNTL_COMMENT_ADMIN")
                .userNm("Comment Admin")
                .password("password")
                .authorCode("ROLE_ADMIN")
                .roleName("ADMIN")
                .lockAt("N")
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, "password", principal.getAuthorities()));
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class TestEventConfig {

        @Bean
        FailBeforeCommitListener failBeforeCommitListener() {
            return new FailBeforeCommitListener();
        }

    }

    static final class FailBeforeCommitListener {
        private final AtomicBoolean failNext = new AtomicBoolean();

        void failNextEvent() {
            failNext.set(true);
        }

        void reset() {
            failNext.set(false);
        }

        @TransactionalEventListener(phase = TransactionPhase.BEFORE_COMMIT)
        public void failBeforeCommit(PostCommentCountChangedEvent ignored) {
            if (failNext.compareAndSet(true, false)) {
                throw new IllegalStateException("forced comment-count listener failure");
            }
        }
    }

}
