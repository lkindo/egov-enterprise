package com.company.project.domain.user.repository;

import com.company.project.domain.user.entity.*;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;

import static com.company.project.domain.user.entity.QEnterpriseUser.enterpriseUser;
import static com.company.project.domain.user.entity.QGeneralUser.generalUser;
import static com.company.project.domain.user.entity.QUser.user;

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

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    @Override
    public int checkIdDplct(String checkId) {
        long userCount = queryFactory
                .select(user.count())
                .from(user)
                .where(user.userId.eq(checkId))
                .fetchOne();

        long enterpriseCount = queryFactory
                .select(enterpriseUser.count())
                .from(enterpriseUser)
                .where(enterpriseUser.entrprsmberId.eq(checkId))
                .fetchOne();

        long generalCount = queryFactory
                .select(generalUser.count())
                .from(generalUser)
                .where(generalUser.mberId.eq(checkId))
                .fetchOne();

        return (int) (userCount + enterpriseCount + generalCount);
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

        if ("0".equals(searchCondition) || "EMPLYR_ID".equals(searchCondition)) {
            return user.userId.contains(searchKeyword);
        } else if ("1".equals(searchCondition) || "USER_NM".equals(searchCondition)) {
            return user.userNm.contains(searchKeyword);
        } else if ("OFFM_TELNO".equals(searchCondition)) {
            return user.offmTelno.contains(searchKeyword);
        }

        return null;
    }
}