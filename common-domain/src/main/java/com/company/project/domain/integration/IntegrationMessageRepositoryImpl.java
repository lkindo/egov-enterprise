package com.company.project.domain.integration;

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
                .selectFrom(QIntegrationMessage.integrationMessage)
                .where(
                        QIntegrationMessage.integrationMessage.useAt.eq("Y"),
                        nameContains(searchKeyword))
                .fetch();
    }

    @Override
    public long countMessages(String searchKeyword) {
        return queryFactory
                .select(QIntegrationMessage.integrationMessage.count())
                .from(QIntegrationMessage.integrationMessage)
                .where(
                        QIntegrationMessage.integrationMessage.useAt.eq("Y"),
                        nameContains(searchKeyword))
                .fetchOne();
    }

    private BooleanExpression nameContains(String searchKeyword) {
        return StringUtils.hasText(searchKeyword)
                ? QIntegrationMessage.integrationMessage.cntcMessageNm.contains(searchKeyword)
                : null;
    }
}