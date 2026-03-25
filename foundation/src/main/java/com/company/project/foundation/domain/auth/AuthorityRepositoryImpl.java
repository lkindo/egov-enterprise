package com.company.project.foundation.domain.auth;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static com.company.project.foundation.domain.auth.QAuthority.authority;

@RequiredArgsConstructor
public class AuthorityRepositoryImpl implements AuthorityRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<Authority> searchAuthorities(String searchCondition, String searchKeyword, @NonNull Pageable pageable) {
        List<Authority> content = queryFactory
                .selectFrom(authority)
                .where(conditionEq(searchCondition, searchKeyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(authority.authorCreatDe.desc())
                .fetch();

        Long total = queryFactory
                .select(authority.count())
                .from(authority)
                .where(conditionEq(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable),
                total != null ? total : 0L);
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
