package nuri.business.domain.log;

import jakarta.persistence.EntityManager;
import nuri.foundation.core.persistence.VendorSqlDialect;

/**
 * 감사 원장(tb_privacy_log·tb_sys_adt_log)의 보존 정리 삭제를 현재 트랜잭션에서만 허용하도록 DB 에 선언한다(2026-10-18, V2_132).
 *
 * <p>V2_132 의 트리거는 감사 원장의 UPDATE 를 언제나 거부하고, DELETE 는 같은 트랜잭션이
 * {@code app.audit_retention = 'on'} 을 지역 선언했을 때만 받는다. 보존 기간이 지난 행을 지우는 정리 경로만 이 선언을 쓴다 —
 * 다른 경로의 삭제·수정은 DB 가 거부한다. 선언은 {@code set_config(..., true)} 라 이 트랜잭션이 끝나면 사라진다.
 *
 * <p>PostgreSQL 에서만 선언한다. 단위 테스트의 H2 에는 트리거도 {@code set_config} 도 없다. 호출자는 반드시 쓰기 트랜잭션 안에서
 * 부른다 — 트랜잭션 밖(자동 커밋)에서 지역 선언은 바로 사라져 이어지는 삭제가 거부된다(조용히 지나가지 않는다).
 */
final class AuditLedgerRetention {

    /** V2_132 트리거가 읽는 트랜잭션 지역 설정 이름. */
    static final String SETTING = "app.audit_retention";

    private AuditLedgerRetention() {
    }

    static void permitDeletionInCurrentTransaction(EntityManager entityManager, VendorSqlDialect vendorSql) {
        vendorSql.permitLedgerDeletion(entityManager, VendorSqlDialect.LedgerDeletionPermit.AUDIT_RETENTION);
    }
}
