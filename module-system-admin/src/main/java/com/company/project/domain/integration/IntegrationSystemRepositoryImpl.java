package com.company.project.domain.integration;

import java.util.List;
import org.springframework.data.jpa.repository.support.QuerydslRepositorySupport;
import org.springframework.util.StringUtils;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;

public class IntegrationSystemRepositoryImpl extends QuerydslRepositorySupport
        implements IntegrationSystemRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public IntegrationSystemRepositoryImpl(JPAQueryFactory queryFactory) {
        super(IntegrationSystem.class);
        this.queryFactory = queryFactory;
    }

    @Override
    public List<IntegrationSystem> searchSystems(String insttId) {
        return queryFactory
                .selectFrom(QIntegrationSystem.integrationSystem)
                .where(
                        QIntegrationSystem.integrationSystem.useAt.eq("Y"),
                        insttIdEq(insttId))
                .fetch();
    }

    @Override
    public long countSystems(String insttId) {
        return queryFactory
                .select(QIntegrationSystem.integrationSystem.count())
                .from(QIntegrationSystem.integrationSystem)
                .where(
                        QIntegrationSystem.integrationSystem.useAt.eq("Y"),
                        insttIdEq(insttId))
                .fetchOne();
    }

    private BooleanExpression insttIdEq(String insttId) {
        return StringUtils.hasText(insttId) ? QIntegrationSystem.integrationSystem.id.insttId.eq(insttId) : null;
    }
}
