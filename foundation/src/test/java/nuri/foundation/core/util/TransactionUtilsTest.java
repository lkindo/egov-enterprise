package nuri.foundation.core.util;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * 커밋 후 실행 유틸 테스트.
 *
 * <p>[2026-08-09 신설] 전량 미커버였다.
 *
 * <p>이 유틸이 존재하는 이유를 소스가 적어 두었다 — 비동기(@Async)·별도 트랜잭션(REQUIRES_NEW)
 * 후속 작업을 <b>부모 커밋 전에</b> 기동하면, 그 작업의 새 트랜잭션이 부모의 미커밋 행을
 * READ_COMMITTED 로 보지 못해 <b>no-op 으로 끝난다</b>. 실제로 그 형태의 결함이 있었다:
 * <i>SMS 미발송, 메일 상태 'P' 고착</i>.
 *
 * <p>즉 여기서 분기가 뒤집히면 <b>후속 작업이 조용히 사라진다</b> —
 * 예외도 나지 않고, 로그도 남지 않고, 메일·SMS 만 안 간다.
 * 발신 실패가 아니라 <b>발신 시도 자체가 없었던</b> 것이라 추적도 어렵다.
 */
@DisplayName("커밋 후 실행 유틸 테스트")
class TransactionUtilsTest {

    @AfterEach
    void tearDown() {
        // 정적 홀더라 정리하지 않으면 뒤 테스트로 샌다.
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    @DisplayName("활성 트랜잭션이 없으면 즉시 실행한다")
    void runsImmediatelyWithoutTransaction() {
        AtomicInteger ran = new AtomicInteger();

        TransactionUtils.runAfterCommit(ran::incrementAndGet);

        // 지연시킬 커밋이 없는데 등록만 하면 **영원히 실행되지 않는다.**
        assertThat(ran.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("활성 트랜잭션이 있으면 커밋 전에는 실행하지 않는다")
    void doesNotRunBeforeCommit() {
        TransactionSynchronizationManager.initSynchronization();
        AtomicInteger ran = new AtomicInteger();

        TransactionUtils.runAfterCommit(ran::incrementAndGet);

        // 여기서 이미 실행되면 후속 작업이 부모의 미커밋 행을 못 보고 no-op 으로 끝난다
        //   — 소스 주석이 적어 둔 'SMS 미발송·메일 상태 P 고착' 이 정확히 그 형태다.
        assertThat(ran.get()).isZero();
        assertThat(TransactionSynchronizationManager.getSynchronizations()).hasSize(1);
    }

    @Test
    @DisplayName("커밋 이후에 실행한다")
    void runsAfterCommit() {
        TransactionSynchronizationManager.initSynchronization();
        AtomicInteger ran = new AtomicInteger();

        TransactionUtils.runAfterCommit(ran::incrementAndGet);
        commit();

        // afterCommit 구현이 비어 있으면 등록은 되는데 아무 일도 일어나지 않는다 —
        //   "예약했다" 는 사실만 남고 결과가 없는, 가장 찾기 어려운 형태다.
        assertThat(ran.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("여러 작업을 예약하면 예약한 순서대로 실행한다")
    void runsInRegistrationOrder() {
        TransactionSynchronizationManager.initSynchronization();
        List<String> order = new ArrayList<>();

        TransactionUtils.runAfterCommit(() -> order.add("첫째"));
        TransactionUtils.runAfterCommit(() -> order.add("둘째"));
        TransactionUtils.runAfterCommit(() -> order.add("셋째"));
        commit();

        assertThat(order).containsExactly("첫째", "둘째", "셋째");
    }

    @Test
    @DisplayName("커밋이 일어나지 않으면(롤백) 실행하지 않는다")
    void doesNotRunOnRollback() {
        TransactionSynchronizationManager.initSynchronization();
        AtomicInteger ran = new AtomicInteger();

        TransactionUtils.runAfterCommit(ran::incrementAndGet);
        // 커밋 없이 정리한다 — 롤백된 트랜잭션의 후속 작업이 실행되면
        //   존재하지 않는 데이터에 대한 메일·SMS 가 나간다.
        TransactionSynchronizationManager.clearSynchronization();

        assertThat(ran.get()).isZero();
    }

    @Test
    @DisplayName("커밋 후 한 부수효과가 실패해도 거짓 API 실패나 뒤 콜백 차단을 만들지 않는다")
    void isolatesFailureAfterCommit() {
        TransactionSynchronizationManager.initSynchronization();
        AtomicInteger ran = new AtomicInteger();

        TransactionUtils.runAfterCommit(() -> {
            throw new IllegalStateException("sensitive failure detail");
        });
        TransactionUtils.runAfterCommit(ran::incrementAndGet);

        assertThatCode(TransactionUtilsTest::commit).doesNotThrowAnyException();
        assertThat(ran.get()).isEqualTo(1);
    }

    @Test
    @DisplayName("트랜잭션이 없을 때의 즉시 실행 오류는 호출자에게 그대로 전달한다")
    void immediateFailureStillPropagates() {
        assertThatCode(() -> TransactionUtils.runAfterCommit(
                () -> { throw new IllegalStateException("failure"); }))
                .isInstanceOf(IllegalStateException.class);
    }

    /** 등록된 동기화들의 afterCommit 을 순서대로 발화시킨다(스프링이 커밋 시 하는 일). */
    private static void commit() {
        for (TransactionSynchronization s : TransactionSynchronizationManager.getSynchronizations()) {
            s.afterCommit();
        }
    }
}
