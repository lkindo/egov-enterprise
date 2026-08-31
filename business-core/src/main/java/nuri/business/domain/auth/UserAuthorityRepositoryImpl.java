package nuri.business.domain.auth;

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
import static nuri.business.domain.auth.QUserAuthority.userAuthority;
import static nuri.business.domain.user.entity.QDeptManage.deptManage;
import static nuri.business.domain.user.entity.QUser.user;

public class UserAuthorityRepositoryImpl implements UserAuthorityRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public UserAuthorityRepositoryImpl(EntityManager em) {
        this.queryFactory = new JPAQueryFactory(em);
    }

    @Override
    public Page<AuthorGroupProjection> searchAuthorGroups(String searchCondition, String searchKeyword,
            Pageable pageable) {
        return searchAuthorGroups(searchCondition, searchKeyword, null, pageable);
    }

    @Override
    public Page<AuthorGroupProjection> searchAuthorGroups(String searchCondition, String searchKeyword,
            String authorCode, Pageable pageable) {
        // eGovFrame legacy combines 3 tables, but we focus on NEMPLYRINFO (User entity)
        BooleanExpression authorityJoin = user.esntlId.eq(userAuthority.scrtyDcsnTrgtId);
        if (StringUtils.hasText(authorCode)) {
            authorityJoin = authorityJoin.and(userAuthority.authrtId.eq(authorCode));
        }
        var query = queryFactory
                .select(Projections.bean(AuthorGroupProjection.class,
                        user.userId.as("userId"),
                        user.userNm.as("userNm"),
                        user.groupId.as("groupId"),
                        new CaseBuilder().when(user.userId.isNotNull()).then("USR03").otherwise("").as("mbrTypeCd"),
                        userAuthority.authrtId.as("authrtId"),
                        new CaseBuilder()
                                .when(userAuthority.scrtyDcsnTrgtId.isNotNull()).then("Y")
                                .otherwise("N").as("regYn"),
                        user.esntlId.as("scrtyDcsnTrgtId")))
                .from(user)
                .leftJoin(userAuthority).on(authorityJoin)
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
                        deptManage.ognzId.as("deptCode"),
                        deptManage.ognzNm.as("deptNm"),
                        user.userId.as("userId"),
                        user.userNm.as("userNm"),
                        userAuthority.authrtId.as("authrtId"),
                        user.esntlId.as("scrtyDcsnTrgtId"),
                        new CaseBuilder()
                                .when(userAuthority.scrtyDcsnTrgtId.isNotNull()).then("Y")
                                .otherwise("N").as("regYn")))
                .from(deptManage)
                .join(user).on(deptManage.ognzId.eq(user.ognzId))
                .leftJoin(userAuthority).on(user.esntlId.eq(userAuthority.scrtyDcsnTrgtId))
                .where(deptManage.ognzId.eq(deptCode))
                .orderBy(user.userId.asc());

        if (pageable.isPaged()) {
            query.offset(pageable.getOffset()).limit(pageable.getPageSize());
        }
        List<DeptAuthorProjection> content = query.fetch();

        Long totalResult = queryFactory
                .select(user.count())
                .from(deptManage)
                .join(user).on(deptManage.ognzId.eq(user.ognzId))
                .where(deptManage.ognzId.eq(deptCode))
                .fetchOne();
        long total = totalResult != null ? totalResult : 0L;

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    private BooleanExpression conditionEq(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        /*
         * [2026-08-29] "0" = 통합(로그인 ID 또는 성명).
         *
         * 권한 관리의 사용자 검색창은 '사용자 검색(ID, 성명)' 이라고 두 축을 약속하는데
         * 화면이 보내던 "1" 은 로그인 ID 하나만 걸렀다. 같은 목록의 행은 성명을 굵은 첫 줄로,
         * ID 를 그 아래 흐린 보조줄로 그리므로 **화면에서 가장 크게 보이는 값이 정확히
         * 검색되지 않는 값**이었다. "홍길동" 을 치면 오류 없이 빈 목록이 나온다.
         *
         * 기존 "1"·"2"·"3" 의미는 그대로 두고 값을 하나 더한다 — 다른 호출자의 거동을
         * 바꾸지 않기 위해서다.
         */
        if ("0".equals(searchCondition)) {
            return user.userId.contains(searchKeyword)
                    .or(user.userNm.contains(searchKeyword));
        } else if ("1".equals(searchCondition)) {
            return user.userId.contains(searchKeyword);
        } else if ("2".equals(searchCondition)) {
            return user.userNm.contains(searchKeyword);
        } else if ("3".equals(searchCondition)) {
            return user.groupId.eq(searchKeyword);
        }

        return null;
    }
}
