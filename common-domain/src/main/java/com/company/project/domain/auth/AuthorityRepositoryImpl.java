package com.company.project.domain.auth;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

import static com.company.project.domain.auth.QAuthority.authority;

@RequiredArgsConstructor
public class AuthorityRepositoryImpl implements AuthorityRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<Authority> searchAuthorities(String searchCondition, String searchKeyword, Pageable pageable) {
        List<Authority> content = queryFactory
                .selectFrom(authority)
                .where(conditionEq(searchCondition, searchKeyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(authority.authorCreatDe.desc())
                .fetch();

        long total = queryFactory
                .select(authority.count())
                .from(authority)
                .where(conditionEq(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(content, pageable, total);
    }

    private BooleanExpression conditionEq(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("1".equals(searchCondition)) {
            return authority.authorNm.contains(searchKeyword);
        }

        return null;
    }
}
