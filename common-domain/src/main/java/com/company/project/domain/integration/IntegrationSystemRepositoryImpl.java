package com.company.project.domain.integration;

import static com.company.project.domain.integration.QIntegrationSystem.integrationSystem;

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
                .selectFrom(integrationSystem)
                .where(
                        integrationSystem.useAt.eq("Y"),
                        insttIdEq(insttId))
                .fetch();
    }

    @Override
    public long countSystems(String insttId) {
        return queryFactory
                .select(integrationSystem.count())
                .from(integrationSystem)
                .where(
                        integrationSystem.useAt.eq("Y"),
                        insttIdEq(insttId))
                .fetchOne();
    }

    private BooleanExpression insttIdEq(String insttId) {
        return StringUtils.hasText(insttId) ? integrationSystem.id.insttId.eq(insttId) : null;
    }
}
