package nuri.foundation.core.persistence;

import org.hibernate.community.dialect.CUBRIDDialect;
import org.hibernate.dialect.lock.internal.LockingSupportSimple;
import org.hibernate.dialect.lock.spi.LockingSupport;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolutionInfo;

/**
 * 커뮤니티 CUBRID 방언이 버리는 비관적 잠금을 되살린다(ADR-0047 단계 5, 제한 지원).
 *
 * <p>Hibernate 7.4 의 커뮤니티 {@link CUBRIDDialect} 는 {@code PESSIMISTIC_WRITE} 에도 잠금 절을 붙이지 않는다 — 잠근다고 믿은 행을 다른
 * 트랜잭션이 그대로 읽고 고친다. CUBRID 의 {@code SELECT ... FOR UPDATE} 는 같은 행의 잠금 조회와 자식 FK 입력을 막고, 대기 상한이 지나면
 * -75 로 끝난다(2026-11-05 실측). 그래서 모든 비관적 잠금을 {@code FOR UPDATE} 로 낸다.
 *
 * <p>CUBRID 에는 {@code NOWAIT}·{@code SKIP LOCKED}·문장 단위 대기 상한이 없다. 잠금 대기 힌트는 쓰지 않고, 대기는 연결 초기화가 거는 세션
 * 상한({@code SET TRANSACTION LOCK TIMEOUT})이 묶는다. SKIP LOCKED 를 바라는 작업 선점은 앞 작업을 기다린 뒤 행을 다시 판정해 다음
 * 대기 행을 받는다 — 결과는 같고 처리량이 준다(실측, 원장의 저하 안내).
 */
public class NuriCubridDialect extends CUBRIDDialect {

    public NuriCubridDialect() {
    }

    public NuriCubridDialect(DialectResolutionInfo info) {
        super(info);
    }

    @Override
    public LockingSupport getLockingSupport() {
        return LockingSupportSimple.NO_OUTER_JOIN;
    }

    @Override
    public String getForUpdateString() {
        return " for update";
    }
}
