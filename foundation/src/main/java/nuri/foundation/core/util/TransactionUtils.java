package nuri.foundation.core.util;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * 트랜잭션 동기화 유틸.
 *
 * <p>{@link #runAfterCommit(Runnable)} 은 활성 트랜잭션이 있으면 <b>커밋 이후</b>에, 없으면 즉시 실행한다.
 * 비동기(@Async)·별도 트랜잭션(REQUIRES_NEW) 후속 작업을 부모 커밋 전에 기동하면, 그 작업의 새 트랜잭션이
 * 부모의 미커밋 행을 READ_COMMITTED 로 보지 못해 no-op/유실되는 결함(예: SMS 미발송, 메일 상태 'P' 고착)을 방지한다.
 */
public final class TransactionUtils {

    private TransactionUtils() {
    }

    public static void runAfterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            // 활성 트랜잭션이 없으면(비트랜잭션 컨텍스트) 지연시킬 대상이 없으므로 즉시 실행.
            action.run();
        }
    }
}
