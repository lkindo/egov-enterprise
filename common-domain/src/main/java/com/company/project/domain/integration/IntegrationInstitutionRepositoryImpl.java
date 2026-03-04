package com.company.project.domain.integration;

import java.util.List;

import org.springframework.data.jpa.repository.support.QuerydslRepositorySupport;
import org.springframework.util.StringUtils;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;

public class IntegrationInstitutionRepositoryImpl extends QuerydslRepositorySupport
        implements IntegrationInstitutionRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public IntegrationInstitutionRepositoryImpl(JPAQueryFactory queryFactory) {
        super(IntegrationInstitution.class);
        this.queryFactory = queryFactory;
    }

    @Override
    public List<IntegrationInstitution> searchInstitutions(String searchKeyword) {
        return queryFactory
                .selectFrom(QIntegrationInstitution.integrationInstitution)
                .where(
                        QIntegrationInstitution.integrationInstitution.useAt.eq("Y"),
                        nameContains(searchKeyword))
                .fetch();
    }

    @Override
    public long countInstitutions(String searchKeyword) {
        return queryFactory
                .select(QIntegrationInstitution.integrationInstitution.count())
                .from(QIntegrationInstitution.integrationInstitution)
                .where(
                        QIntegrationInstitution.integrationInstitution.useAt.eq("Y"),
                        nameContains(searchKeyword))
                .fetchOne();
    }

    private BooleanExpression nameContains(String searchKeyword) {
        return StringUtils.hasText(searchKeyword)
                ? QIntegrationInstitution.integrationInstitution.insttNm.contains(searchKeyword)
                : null;
    }
}