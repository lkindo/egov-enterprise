package com.company.project.domain.login;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.Expressions;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Objects;

import static com.company.project.domain.login.QLoginPolicy.loginPolicy;
import static com.company.project.domain.user.entity.QUser.user;

@RequiredArgsConstructor
public class LoginPolicyRepositoryImpl implements LoginPolicyRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<LoginPolicySearchResult> search(LoginPolicySearchCondition condition, Pageable pageable) {

        BooleanBuilder builder = new BooleanBuilder();
        if (condition.getSearchKeyword() != null && !condition.getSearchKeyword().isEmpty()) {
            if ("1".equals(condition.getSearchCondition())) { // Name search
                builder.and(user.userNm.contains(condition.getSearchKeyword()));
            }
        }

        List<LoginPolicySearchResult> content = queryFactory
                .select(Projections.fields(LoginPolicySearchResult.class,
                        user.userId.as("emplyrId"),
                        user.userNm,
                        // userSe is not directly available in User entity, skipping or mapping null
                        loginPolicy.ipInfo,
                        loginPolicy.dplctPermAt,
                        loginPolicy.lmttAt,
                        loginPolicy.lastUpdusrId,
                        loginPolicy.lastUpdtPnttm,
                        Expressions.stringTemplate("CASE WHEN {0} IS NULL THEN 'N' ELSE 'Y' END", loginPolicy.emplyrId)
                                .as("regYn")))
                .from(user)
                .leftJoin(loginPolicy).on(user.userId.eq(loginPolicy.emplyrId))
                .where(builder)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long count = queryFactory
                .select(user.count())
                .from(user)
                .leftJoin(loginPolicy).on(user.userId.eq(loginPolicy.emplyrId))
                .where(builder)
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable),
                count != null ? count : 0L);
    }
}