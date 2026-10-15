package nuri.migration.verify;

/** [ADR-0029 L4 D2·D7] 대상 대사 질의 실패. SQLSTATE 만 담는다 — PostgreSQL 형 변환 오류 문구에는 입력값이 들어간다. */
public final class ReconciliationQueryException extends RuntimeException {

    private final String sqlState;

    public ReconciliationQueryException(String sqlState) {
        super("RECONCILIATION_QUERY_FAILED(SQLSTATE=" + (sqlState == null ? "unknown" : sqlState) + ")",
                null, false, false);
        this.sqlState = sqlState;
    }

    public String sqlState() {
        return sqlState;
    }
}
