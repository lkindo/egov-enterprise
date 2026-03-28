package com.company.project.foundation.core.repository;

import com.querydsl.core.types.Order;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.jpa.impl.JPAQuery;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;

/**
 * QueryDSL 지원 추상 클래스
 * 페이징 처리 및 동적 쿼리 편의 매직을 제공합니다.
 */
public abstract class QuerydslSupport {

    /**
     * JPAQuery에 Pageable 정보를 적용합니다.
     */
    protected <T> JPAQuery<T> applyPagination(JPAQuery<T> query, Pageable pageable) {
        if (pageable.isUnpaged()) {
            return query;
        }
        return query.offset(pageable.getOffset())
                .limit(pageable.getPageSize());
    }

    /**
     * 조건이 존재할 때만 and 연산을 수행합니다.
     */
    protected BooleanExpression andIf(BooleanExpression base, Supplier<BooleanExpression> condition) {
        BooleanExpression next = condition.get();
        if (next == null) return base;
        return base == null ? next : base.and(next);
    }

    /**
     * Spring Data Sort를 QueryDSL OrderSpecifier로 변환합니다.
     */
    @SuppressWarnings("unchecked")
    protected OrderSpecifier<?>[] getOrderSpecifiers(Sort sort, Path<?> parent) {
        List<OrderSpecifier<?>> orders = new ArrayList<>();
        for (Sort.Order order : sort) {
            Order direction = order.isAscending() ? Order.ASC : Order.DESC;
            orders.add(new OrderSpecifier(direction, Expressions.path(Object.class, parent, order.getProperty())));
        }
        return orders.toArray(new OrderSpecifier[0]);
    }
}
