package com.company.project.domain.integration;

import static com.company.project.domain.integration.QIntegrationMessage.integrationMessage;

import java.util.List;

import org.springframework.data.jpa.repository.support.QuerydslRepositorySupport;
import org.springframework.util.StringUtils;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;

public class IntegrationMessageRepositoryImpl extends QuerydslRepositorySupport
        implements IntegrationMessageRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public IntegrationMessageRepositoryImpl(JPAQueryFactory queryFactory) {
        super(IntegrationMessage.class);
        this.queryFactory = queryFactory;
    }

    @Override
    public List<IntegrationMessage> searchMessages(String searchKeyword) {
        return queryFactory
                .selectFrom(integrationMessage)
                .where(
                        integrationMessage.useAt.eq("Y"),
                        nameContains(searchKeyword))
                .fetch();
    }

    @Override
    public long countMessages(String searchKeyword) {
        return queryFactory
                .select(integrationMessage.count())
                .from(integrationMessage)
                .where(
                        integrationMessage.useAt.eq("Y"),
                        nameContains(searchKeyword))
                .fetchOne();
    }

    private BooleanExpression nameContains(String searchKeyword) {
        return StringUtils.hasText(searchKeyword) ? integrationMessage.cntcMessageNm.contains(searchKeyword) : null;
    }
}
