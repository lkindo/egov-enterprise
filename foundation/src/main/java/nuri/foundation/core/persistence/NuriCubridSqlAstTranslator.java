package nuri.foundation.core.persistence;

import org.hibernate.community.dialect.CUBRIDSqlAstTranslator;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.hibernate.sql.ast.Clause;
import org.hibernate.sql.ast.tree.Statement;
import org.hibernate.sql.ast.tree.from.NamedTableReference;
import org.hibernate.sql.exec.spi.JdbcOperation;

/**
 * 대량 갱신·삭제의 대상 표에 별칭을 단다(ADR-0047 단계 5).
 *
 * <p>Hibernate 는 대량 갱신·삭제의 조건 일부(필터, {@code @SQLRestriction} 조각)를 대상 표의 별칭으로 쓴다. 커뮤니티 번역기는 대상 표를 별칭 없이 내
 * {@code update tb_x set ... where x1_0.col = ?} 가 {@code Attribute "x1_0" was not found} 로 실패했다(2026-11-06 원본 통합 실행). 방언이 열 한정자를
 * 별칭으로 두고({@code TABLE_ALIAS}) 이 번역기가 대상 표 뒤에 그 별칭을 낸다 — CUBRID 는 {@code UPDATE 표 별칭 SET 별칭.열 ...} 과
 * {@code DELETE FROM 표 별칭 WHERE ...} 를 받는다(실측). INSERT 의 대상에는 별칭을 달지 않는다.
 */
public class NuriCubridSqlAstTranslator<T extends JdbcOperation> extends CUBRIDSqlAstTranslator<T> {

    public NuriCubridSqlAstTranslator(SessionFactoryImplementor sessionFactory, Statement statement) {
        super(sessionFactory, statement);
    }

    @Override
    protected void renderDmlTargetTableExpression(NamedTableReference tableReference) {
        super.renderDmlTargetTableExpression(tableReference);
        if (getClauseStack().getCurrent() != Clause.INSERT) {
            renderTableReferenceIdentificationVariable(tableReference);
        }
    }
}
