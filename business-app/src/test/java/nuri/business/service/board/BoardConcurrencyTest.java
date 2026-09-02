package nuri.business.service.board;

import nuri.business.TestApplication;
import nuri.business.domain.board.Board;
import nuri.business.domain.board.BoardMaster;
import nuri.business.domain.board.BoardMasterRepository;
import nuri.business.domain.board.BoardRepository;
import nuri.business.security.config.TestSecurityConfig;
import nuri.business.core.config.TestMessagingConfig;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import nuri.business.security.annotation.WithMockCustomUser;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 고부하 동시성 및 데이터 경쟁 제어 검증 통합 테스트
 * - 100개의 스레드가 동시에 좋아요(추천수) 증가를 요청했을 때 갱신 분실(Lost Update) 없이 안전하게 동시성이 제어되는지 보증합니다.
 * - 비관적 락(Pessimistic Lock)의 데이터 정합성을 실증합니다.
 */
@SpringBootTest(classes = TestApplication.class)
@Import({ TestSecurityConfig.class, TestMessagingConfig.class })
@ActiveProfiles("test")
class BoardConcurrencyTest {

    @Autowired
    private BoardService boardService;

    @Autowired
    private BoardRepository boardRepository;

    @Autowired
    private BoardMasterRepository boardMasterRepository;

    private String testBbsId;
    private Long testPstSn;
    private ExecutorService executorService;

    @BeforeEach
    void setUp() {
        executorService = Executors.newFixedThreadPool(32);
        
        // 1. 테스트용 게시판 마스터 생성
        testBbsId = "BBS_" + UUID.randomUUID().toString().substring(0, 10);
        BoardMaster master = BoardMaster.builder()
                .bbsId(testBbsId)
                .bbsTtl("동시성 테스트 게시판")
                .bbsTypeCd("BBST01")
                .bbsAtrbCd("BBSA01")
                .useYn("Y")
                .build();
        boardMasterRepository.saveAndFlush(master);

        // 2. 테스트용 게시글 생성 (초기 추천수 likeCnt = 0)
        Board board = Board.builder()
                .bbsId(testBbsId)
                .pstTtl("동시성 테스트 제목")
                .pstCn("동시성 테스트 내용")
                .useYn("Y")
                .userId("tester")
                .userNm("테스터")
                .likeCnt(0)
                .inqCnt(0)
                .build();
        testPstSn = boardRepository.saveAndFlush(board).getPstSn();
    }

    @AfterEach
    void tearDown() {
        // 테스트 데이터 청소
        boardRepository.deleteById(testPstSn);
        boardMasterRepository.deleteById(testBbsId);
        
        if (executorService != null) {
            executorService.shutdown();
        }
    }

    @Test
    // [W1-17] 메커니즘이 '비관적 락'에서 '원자 UPDATE'로 바뀌었다. 불변식(유실 0)은 그대로이므로
    //   단언은 유지하고 서술만 정정한다 — 이 테스트가 원자 방식의 정확성을 실증하는 근거다.
    //   원자 UPDATE 는 행 락을 잡지 않으므로 같은 글의 좋아요가 직렬화되지도 않는다.
    @DisplayName("고부하 동시성 검증 - 100명이 동시에 좋아요 누를 시 원자 UPDATE 로 추천수가 유실 없이 정확히 100만큼 증가함")
    @WithMockCustomUser(username = "tester", role = "USER", esntlId = "tester")
    void incrementLike_concurrencySafelyControlled() throws InterruptedException {
        // Given: 100개의 동시 요청 준비
        int threadCount = 100;
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        // When: 100개 스레드 동시 기동 및 폭격
        for (int i = 0; i < threadCount; i++) {
            executorService.submit(() -> {
                try {
                    startLatch.await(); // 모든 스레드가 신호 대기
                    boardService.incrementLike(testBbsId, testPstSn);
                } catch (Exception e) {
                    System.err.println("동시성 요청 실패: " + e.getMessage());
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // 폭격 시작!
        startLatch.countDown();
        boolean completed = doneLatch.await(30, TimeUnit.SECONDS);
        assertThat(completed).isTrue();

        // Then: 최종 DB 반영 결과 검증
        Board finalBoard = boardRepository.findById(testPstSn)
                .orElseThrow(() -> new AssertionError("게시글이 존재하지 않습니다."));
        
        // 갱신 분실(Lost Update)이 발생했다면 100보다 현저히 적은 숫자가 됨
        // 비관적 락이 완벽히 동작했다면 정확히 100이 됨
        assertThat(finalBoard.getLikeCnt())
                .withFailMessage("갱신 분실이 발생했습니다. 예상 추천수: 100, 실제 추천수: %d", finalBoard.getLikeCnt())
                .isEqualTo(100);
    }

    @Test
    @DisplayName("동시 댓글 delta는 갱신 유실 없이 누적되고 감소 시 0에서 멈춘다")
    void adjustCommentCount_concurrentDeltasAreAtomicAndNonNegative() throws InterruptedException {
        runConcurrentCommentDeltas(64, 1);

        assertThat(boardRepository.findById(testPstSn).orElseThrow().getCmntCnt())
                .as("동시 +1 갱신 중 하나라도 read-modify-write로 유실되면 64보다 작아진다")
                .isEqualTo(64);

        runConcurrentCommentDeltas(80, -1);

        assertThat(boardRepository.findById(testPstSn).orElseThrow().getCmntCnt())
                .as("감소량이 현재 수보다 많아도 댓글 수는 음수가 되면 안 된다")
                .isZero();
    }

    private void runConcurrentCommentDeltas(int requestCount, int delta) throws InterruptedException {
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(requestCount);
        ConcurrentLinkedQueue<Throwable> failures = new ConcurrentLinkedQueue<>();

        for (int i = 0; i < requestCount; i++) {
            executorService.submit(() -> {
                try {
                    startLatch.await();
                    boardRepository.adjustCmntCntAtomic(testBbsId, testPstSn, delta);
                } catch (Throwable failure) {
                    failures.add(failure);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        assertThat(doneLatch.await(30, TimeUnit.SECONDS))
                .as("동시 댓글 수 갱신이 제한 시간 안에 끝나야 한다")
                .isTrue();
        assertThat(failures)
                .as("worker 예외를 삼키면 최종 count 단언만으로 원인을 잃는다")
                .isEmpty();
    }
}
