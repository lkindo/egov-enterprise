package nuri.migration.verify;

import nuri.migration.postgres.TargetConstraintSnapshot;
import nuri.migration.postgres.TargetSchemaFingerprint.TableMetadata;

import java.util.List;
import java.util.Map;

/**
 * [ADR-0029 L4 D2·D7] 대사가 대상 DB 안에서 세는 질의. 값은 JVM 으로 오지 않고 건수만 온다. 구현은 호출마다 자기 읽기 전용
 * 트랜잭션을 쓰고, SQL 오류는 SQLSTATE 만 담은 {@link ReconciliationQueryException} 으로 바꾼다.
 */
public interface TargetReconciliationQueries {

    /** 한 열 한 행의 건수. */
    long count(String sql, List<Object> args);

    /** 한 행의 열 별칭 → 건수. */
    Map<String, Long> counts(String sql, List<Object> args);

    /** 매핑 대상 표의 지금 제약 스냅숏(끝 스냅숏). */
    TargetConstraintSnapshot constraints(List<TableMetadata> tables);
}
