package com.company.project.domain.auth;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.core.types.dsl.CaseBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static com.company.project.domain.auth.QUserAuthority.userAuthority;
import static com.company.project.domain.user.entity.QDeptManage.deptManage;
import static com.company.project.domain.user.entity.QUser.user;

public class UserAuthorityRepositoryImpl implements UserAuthorityRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public UserAuthorityRepositoryImpl(EntityManager em) {
        this.queryFactory = new JPAQueryFactory(em);
    }

    @Override
    public Page<AuthorGroupProjection> searchAuthorGroups(String searchCondition, String searchKeyword,
            Pageable pageable) {
        // eGovFrame legacy combines 3 tables, but we focus on NEMPLYRINFO (User entity)
        var query = queryFactory
                .select(Projections.bean(AuthorGroupProjection.class,
                        user.userId.as("userId"),
                        user.userNm.as("userNm"),
                        user.groupId.as("groupId"),
                        new CaseBuilder().when(user.userId.isNotNull()).then("USR03").otherwise("").as("mberTyCode"),
                        userAuthority.authorCode.as("authorCode"),
                        new CaseBuilder()
                                .when(userAuthority.uniqId.isNotNull()).then("Y")
                                .otherwise("N").as("regYn"),
                        user.esntlId.as("uniqId")))
                .from(user)
                .leftJoin(userAuthority).on(user.esntlId.eq(userAuthority.uniqId))
                .where(conditionEq(searchCondition, searchKeyword))
                .orderBy(user.userId.asc());

        if (pageable.isPaged()) {
            query.offset(pageable.getOffset()).limit(pageable.getPageSize());
        }
        List<AuthorGroupProjection> content = query.fetch();

        Long totalResult = queryFactory
                .select(user.count())
                .from(user)
                .where(conditionEq(searchCondition, searchKeyword))
                .fetchOne();
        long total = totalResult != null ? totalResult : 0L;

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    @Override
    public Page<DeptAuthorProjection> searchDeptAuthors(String deptCode, Pageable pageable) {
        var query = queryFactory
                .select(Projections.bean(DeptAuthorProjection.class,
                        deptManage.orgnztId.as("deptCode"),
                        deptManage.orgnztNm.as("deptNm"),
                        user.userId.as("userId"),
                        user.userNm.as("userNm"),
                        userAuthority.authorCode.as("authorCode"),
                        user.esntlId.as("uniqId"),
                        new CaseBuilder()
                                .when(userAuthority.uniqId.isNotNull()).then("Y")
                                .otherwise("N").as("regYn")))
                .from(deptManage)
                .join(user).on(deptManage.orgnztId.eq(user.orgnztId))
                .leftJoin(userAuthority).on(user.esntlId.eq(userAuthority.uniqId))
                .where(deptManage.orgnztId.eq(deptCode))
                .orderBy(user.userId.asc());

        if (pageable.isPaged()) {
            query.offset(pageable.getOffset()).limit(pageable.getPageSize());
        }
        List<DeptAuthorProjection> content = query.fetch();

        Long totalResult = queryFactory
                .select(user.count())
                .from(deptManage)
                .join(user).on(deptManage.orgnztId.eq(user.orgnztId))
                .where(deptManage.orgnztId.eq(deptCode))
                .fetchOne();
        long total = totalResult != null ? totalResult : 0L;

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    private BooleanExpression conditionEq(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("1".equals(searchCondition)) {
            return user.userId.contains(searchKeyword);
        } else if ("2".equals(searchCondition)) {
            return user.userNm.contains(searchKeyword);
        } else if ("3".equals(searchCondition)) {
            return user.groupId.eq(searchKeyword);
        }

        return null;
    }
}
