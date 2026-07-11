package nuri.migration.verify;

import nuri.migration.etl.EtlExecutor.TableResult;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 이관 후 검증 — SKELETON: ETL 결과 기반 리포트 생성.
 * 확장점(설계 §2.2 ④): 타깃 재조회 행수·NOT NULL/FK/UNIQUE 스캔·샘플 diff.
 */
@Component
public class MigrationVerifier {

    public MigrationReport verify(List<TableResult> results) {
        return MigrationReport.from(results);
    }
}
