package com.company.project.domain.integration;

import static com.company.project.domain.integration.QIntegrationMessageItem.integrationMessageItem;

import java.util.List;

import org.springframework.data.jpa.repository.support.QuerydslRepositorySupport;
import org.springframework.util.StringUtils;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;

public class IntegrationMessageItemRepositoryImpl extends QuerydslRepositorySupport
        implements IntegrationMessageItemRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public IntegrationMessageItemRepositoryImpl(JPAQueryFactory queryFactory) {
        super(IntegrationMessageItem.class);
        this.queryFactory = queryFactory;
    }

    @Override
    public List<IntegrationMessageItem> searchMessageItems(String cntcMessageId, String searchKeyword) {
        return queryFactory
                .selectFrom(integrationMessageItem)
                .where(
                        integrationMessageItem.useAt.eq("Y"),
                        cntcMessageIdEq(cntcMessageId),
                        nameContains(searchKeyword))
                .fetch();
    }

    @Override
    public long countMessageItems(String cntcMessageId, String searchKeyword) {
        return queryFactory
                .select(integrationMessageItem.count())
                .from(integrationMessageItem)
                .where(
                        integrationMessageItem.useAt.eq("Y"),
                        cntcMessageIdEq(cntcMessageId),
                        nameContains(searchKeyword))
                .fetchOne();
    }

    private BooleanExpression cntcMessageIdEq(String cntcMessageId) {
        return StringUtils.hasText(cntcMessageId) ? integrationMessageItem.id.cntcMessageId.eq(cntcMessageId) : null;
    }

    private BooleanExpression nameContains(String searchKeyword) {
        return StringUtils.hasText(searchKeyword) ? integrationMessageItem.itemNm.contains(searchKeyword) : null;
    }
}
