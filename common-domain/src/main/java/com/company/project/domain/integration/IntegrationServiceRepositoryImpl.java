package com.company.project.domain.integration;

import static com.company.project.domain.integration.QIntegrationService.integrationService;

import java.util.List;

import org.springframework.data.jpa.repository.support.QuerydslRepositorySupport;
import org.springframework.util.StringUtils;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;

public class IntegrationServiceRepositoryImpl extends QuerydslRepositorySupport
        implements IntegrationServiceRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public IntegrationServiceRepositoryImpl(JPAQueryFactory queryFactory) {
        super(IntegrationService.class);
        this.queryFactory = queryFactory;
    }

    @Override
    public List<IntegrationService> searchServices(String insttId, String sysId) {
        return queryFactory
                .selectFrom(integrationService)
                .where(
                        integrationService.useAt.eq("Y"),
                        insttIdEq(insttId),
                        sysIdEq(sysId))
                .fetch();
    }

    @Override
    public long countServices(String insttId, String sysId) {
        return queryFactory
                .select(integrationService.count())
                .from(integrationService)
                .where(
                        integrationService.useAt.eq("Y"),
                        insttIdEq(insttId),
                        sysIdEq(sysId))
                .fetchOne();
    }

    private BooleanExpression insttIdEq(String insttId) {
        return StringUtils.hasText(insttId) ? integrationService.id.insttId.eq(insttId) : null;
    }

    private BooleanExpression sysIdEq(String sysId) {
        return StringUtils.hasText(sysId) ? integrationService.id.sysId.eq(sysId) : null;
    }
}
