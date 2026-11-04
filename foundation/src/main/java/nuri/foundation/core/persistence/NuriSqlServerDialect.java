package nuri.foundation.core.persistence;

import org.hibernate.LockMode;
import org.hibernate.LockOptions;
import org.hibernate.Timeouts;
import org.hibernate.dialect.DatabaseVersion;
import org.hibernate.dialect.SQLServerDialect;
import org.hibernate.engine.jdbc.dialect.spi.DialectResolutionInfo;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.hibernate.sql.ast.SqlAstTranslator;
import org.hibernate.sql.ast.SqlAstTranslatorFactory;
import org.hibernate.sql.ast.spi.StandardSqlAstTranslatorFactory;
import org.hibernate.sql.ast.tree.Statement;
import org.hibernate.sql.exec.spi.JdbcOperation;

/**
 * 엔티티 잠금 조회를 PostgreSQL 의 뜻에 맞춘다(ADR-0047 단계 4).
 *
 * <p>기본 방언은 쓰기 잠금에 {@code updlock,holdlock}, 읽기 잠금에 {@code holdlock} 을 단다. {@code holdlock} 은 직렬화 격리의 범위 잠금이라
 * 없는 행을 잠그면 그 키의 조회·입력까지 막는다 — PostgreSQL 의 잠금 절은 있는 행만 잠근다. 없는 회원 행을 잠근 가입 요청 뒤에서 같은 키를
 * 먼저 넣으려는 요청이 대기 상한(5초)까지 기다렸다(2026-11-04 통합 시험). {@code updlock,rowlock} 은 없는 키를 잠가도 같은 키의 조회·입력을
 * 막지 않고, 있는 행은 다른 잠금 조회를 막는다(실측). 그래서 범위 잠금 없이 행 갱신 잠금만 건다.
 *
 * <p>갱신 잠금(U)은 FK 검사의 공유 잠금과 어울려 자식 입력을 막지 않는다 — PostgreSQL 의 쓰기 잠금({@code FOR NO KEY UPDATE})과 같다.
 * 읽기 잠금도 갱신 잠금이다. 공유 잠금(S)은 갱신 잠금과 충돌하지 않아, 투표(읽기 잠금)와 설문 편집(쓰기 잠금)이 같은 설문 행에서 줄을 서지
 * 않는다. Oracle 처럼 같은 설문의 투표가 차례로 처리되는 처리량 차이만 남는다(설계서 §6.1).
 *
 * <p>Hibernate 7.4 는 HQL 잠금 힌트를 SQL AST 번역기에서 만든다({@link NuriSqlServerSqlAstTranslator}). {@link #appendLockHint} 는 그 밖의
 * 경로를 위해 같은 힌트로 맞춘다.
 */
public class NuriSqlServerDialect extends SQLServerDialect {

    public NuriSqlServerDialect() {
    }

    public NuriSqlServerDialect(DatabaseVersion version) {
        super(version);
    }

    public NuriSqlServerDialect(DialectResolutionInfo info) {
        super(info);
    }

    @Override
    public SqlAstTranslatorFactory getSqlAstTranslatorFactory() {
        return new StandardSqlAstTranslatorFactory() {
            @Override
            protected <T extends JdbcOperation> SqlAstTranslator<T> buildTranslator(SessionFactoryImplementor sessionFactory,
                    Statement statement) {
                return new NuriSqlServerSqlAstTranslator<>(sessionFactory, statement);
            }
        };
    }

    /** 덮어쓰는 Hibernate 7.4 메서드의 인자 타입이 SPI 패키지로 옮겨질 예정이다(제거 예고). 메서드는 유지된다. */
    @SuppressWarnings("removal")
    @Override
    public String appendLockHint(LockOptions lockOptions, String tableName) {
        int timeout = lockOptions.getTimeout().milliseconds();
        String noWait = timeout == Timeouts.NO_WAIT_MILLI ? ",nowait" : "";
        String skipLocked = timeout == Timeouts.SKIP_LOCKED_MILLI ? ",readpast" : "";
        LockMode mode = lockOptions.getLockMode();
        return switch (mode) {
            case PESSIMISTIC_WRITE, WRITE, PESSIMISTIC_READ -> tableName + " with (updlock,rowlock" + noWait + skipLocked + ")";
            case UPGRADE_NOWAIT -> tableName + " with (updlock,rowlock,nowait)";
            case UPGRADE_SKIPLOCKED -> tableName + " with (updlock,rowlock,readpast)";
            default -> super.appendLockHint(lockOptions, tableName);
        };
    }
}
