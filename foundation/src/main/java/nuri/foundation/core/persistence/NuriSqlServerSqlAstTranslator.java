package nuri.foundation.core.persistence;

import java.util.Map;
import org.hibernate.dialect.sql.ast.SQLServerSqlAstTranslator;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.hibernate.sql.ast.tree.Statement;
import org.hibernate.sql.exec.spi.JdbcOperation;

/**
 * Hibernate 7.4 는 SQL Server 의 엔티티 잠금 힌트를 방언이 아니라 이 번역기가 만든다({@code determineLockHint}). 범위 잠금({@code holdlock})이
 * 든 힌트만 행 갱신 잠금으로 바꾼다. 이유는 {@link NuriSqlServerDialect} 에 있다. 건너뛰기({@code readpast}) 힌트는 원래 범위 잠금이 없다.
 */
public class NuriSqlServerSqlAstTranslator<T extends JdbcOperation> extends SQLServerSqlAstTranslator<T> {

    /** 기본 힌트 → 범위 잠금 없는 힌트. 읽기 잠금도 갱신 잠금이다 — 공유 잠금은 쓰기 잠금과 줄을 서지 않는다. */
    static final Map<String, String> RANGE_FREE_HINTS = Map.of(
            " with (updlock,holdlock,rowlock)", " with (updlock,rowlock)",
            " with (updlock,holdlock,rowlock,nowait)", " with (updlock,rowlock,nowait)",
            " with (holdlock,rowlock)", " with (updlock,rowlock)",
            " with (holdlock,rowlock,nowait)", " with (updlock,rowlock,nowait)");

    public NuriSqlServerSqlAstTranslator(SessionFactoryImplementor sessionFactory, Statement statement) {
        super(sessionFactory, statement);
    }

    /** 잠금 힌트는 한 조각으로 덧붙는다. 그 조각과 정확히 같은 것만 바꾼다. */
    static CharSequence rangeFree(CharSequence fragment) {
        return fragment instanceof String text ? RANGE_FREE_HINTS.getOrDefault(text, text) : fragment;
    }

    @Override
    public Appendable append(CharSequence fragment) {
        return super.append(rangeFree(fragment));
    }
}
