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

import static com.company.project.domain.user.entity.QGeneralUser.generalUser;

@RequiredArgsConstructor
public class GeneralUserRepositoryImpl implements GeneralUserRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<GeneralUser> searchGeneralUsers(String sbscrbSttus, String searchCondition, String searchKeyword,
            Pageable pageable) {
        List<GeneralUser> content = queryFactory
                .selectFrom(generalUser)
                .where(
                        statusEq(sbscrbSttus),
                        conditionEq(searchCondition, searchKeyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(generalUser.sbscrbDe.desc())
                .fetch();

        long total = queryFactory
                .select(generalUser.count())
                .from(generalUser)
                .where(
                        statusEq(sbscrbSttus),
                        conditionEq(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    private BooleanExpression statusEq(String sbscrbSttus) {
        if (!StringUtils.hasText(sbscrbSttus) || "0".equals(sbscrbSttus)) {
            return null;
        }
        return generalUser.mberSttus.eq(sbscrbSttus);
    }

    private BooleanExpression conditionEq(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("0".equals(searchCondition)) {
            return generalUser.mberId.contains(searchKeyword);
        } else if ("1".equals(searchCondition)) {
            return generalUser.mberNm.contains(searchKeyword);
        }

        return null;
    }
}