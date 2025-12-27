package com.company.project.domain.user;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

import static com.company.project.domain.user.QUser.user;

@RequiredArgsConstructor
public class UserRepositoryImpl implements UserRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<User> searchUsers(String sbscrbSttus, String searchCondition, String searchKeyword, Pageable pageable) {
        List<User> content = queryFactory
                .selectFrom(user)
                .where(
                        statusEq(sbscrbSttus),
                        conditionEq(searchCondition, searchKeyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(user.userId.desc())
                .fetch();

        long total = queryFactory
                .select(user.count())
                .from(user)
                .where(
                        statusEq(sbscrbSttus),
                        conditionEq(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(content, pageable, total);
    }

    @Override
    public int checkIdDplct(String checkId) {
        // NEMPLYRINFO (User 엔티티) 대상 중복 체크
        // eGovFrame은 다른 테이블(회원, 기업)도 체크하지만 현재 엔티티 기반으로 우선 구현
        long count = queryFactory
                .select(user.count())
                .from(user)
                .where(user.userId.eq(checkId))
                .fetchOne();
        return (int) count;
    }

    private BooleanExpression statusEq(String sbscrbSttus) {
        if (!StringUtils.hasText(sbscrbSttus) || "0".equals(sbscrbSttus)) {
            return null;
        }
        try {
            Role role = Role.valueOf(sbscrbSttus);
            return user.role.eq(role);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private BooleanExpression conditionEq(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("0".equals(searchCondition)) {
            return user.userId.contains(searchKeyword);
        } else if ("1".equals(searchCondition)) {
            return user.userNm.contains(searchKeyword);
        }

        return null;
    }
}
