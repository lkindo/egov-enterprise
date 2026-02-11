package com.company.project.domain.integration;

import static com.company.project.domain.integration.QIntegrationInstitution.integrationInstitution;

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
                .selectFrom(integrationInstitution)
                .where(
                        integrationInstitution.useAt.eq("Y"),
                        nameContains(searchKeyword))
                .fetch();
    }

    @Override
    public long countInstitutions(String searchKeyword) {
        return queryFactory
                .select(integrationInstitution.count())
                .from(integrationInstitution)
                .where(
                        integrationInstitution.useAt.eq("Y"),
                        nameContains(searchKeyword))
                .fetchOne();
    }

    private BooleanExpression nameContains(String searchKeyword) {
        return StringUtils.hasText(searchKeyword) ? integrationInstitution.insttNm.contains(searchKeyword) : null;
    }
}
