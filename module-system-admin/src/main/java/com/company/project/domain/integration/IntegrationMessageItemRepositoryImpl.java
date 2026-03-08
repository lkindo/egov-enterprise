package com.company.project.domain.integration;

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
                .selectFrom(QIntegrationMessageItem.integrationMessageItem)
                .where(
                        QIntegrationMessageItem.integrationMessageItem.useAt.eq("Y"),
                        cntcMessageIdEq(cntcMessageId),
                        nameContains(searchKeyword))
                .fetch();
    }

    @Override
    public long countMessageItems(String cntcMessageId, String searchKeyword) {
        return queryFactory
                .select(QIntegrationMessageItem.integrationMessageItem.count())
                .from(QIntegrationMessageItem.integrationMessageItem)
                .where(
                        QIntegrationMessageItem.integrationMessageItem.useAt.eq("Y"),
                        cntcMessageIdEq(cntcMessageId),
                        nameContains(searchKeyword))
                .fetchOne();
    }

    private BooleanExpression cntcMessageIdEq(String cntcMessageId) {
        return StringUtils.hasText(cntcMessageId)
                ? QIntegrationMessageItem.integrationMessageItem.id.cntcMessageId.eq(cntcMessageId)
                : null;
    }

    private BooleanExpression nameContains(String searchKeyword) {
        return StringUtils.hasText(searchKeyword)
                ? QIntegrationMessageItem.integrationMessageItem.itemNm.contains(searchKeyword)
                : null;
    }
}
