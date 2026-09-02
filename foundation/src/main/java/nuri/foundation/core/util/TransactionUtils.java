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

    private static final org.slf4j.Logger log =
            org.slf4j.LoggerFactory.getLogger(TransactionUtils.class);

    private TransactionUtils() {
    }

    public static void runAfterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    try {
                        action.run();
                    } catch (RuntimeException e) {
                        // DB 커밋은 이미 끝났다. 여기서 예외를 다시 던지면 클라이언트에는 실패가
                        // 보이지만 데이터는 저장된 거짓 실패가 되고, 뒤에 등록한 콜백도 막힌다.
                        // 업무 데이터나 예외 메시지를 복제하지 않고 유형만 남긴다.
                        log.error("커밋 후 부수효과 실행 실패 — 예외유형={}",
                                e.getClass().getSimpleName());
                    }
                }
            });
        } else {
            // 활성 트랜잭션이 없으면(비트랜잭션 컨텍스트) 지연시킬 대상이 없으므로 즉시 실행.
            action.run();
        }
    }
}
