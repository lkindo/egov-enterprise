package com.company.project.domain.user.repository;

import com.company.project.domain.user.vo.*;

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

import static com.company.project.domain.user.entity.QUser.user;
import static com.company.project.domain.user.entity.QUserAbsence.userAbsence;

@RequiredArgsConstructor
public class UserAbsenceRepositoryImpl implements UserAbsenceRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<UserAbsenceSearchResult> search(UserAbsenceSearchCondition condition, Pageable pageable) {

        BooleanBuilder builder = new BooleanBuilder();

        if (condition.getSearchKeyword() != null && !condition.getSearchKeyword().isEmpty()) {
            if ("1".equals(condition.getSearchCondition())) { // Name search
                builder.and(user.userNm.contains(condition.getSearchKeyword()));
            }
        }

        if (condition.getSelAbsnceAt() != null && !"A".equals(condition.getSelAbsnceAt())) {
            // If selAbsnceAt is not 'A' (All)
            // Logic: Check existing userAbsence.userAbsnceAt OR if null then 'N'
            // QueryDSL: coalesce(userAbsence.userAbsnceAt,
            // 'N').eq(condition.getSelAbsnceAt())
            builder.and(userAbsence.userAbsnceAt.coalesce("N").eq(condition.getSelAbsnceAt()));
        }

        List<UserAbsenceSearchResult> content = queryFactory
                .select(Projections.fields(UserAbsenceSearchResult.class,
                        user.userId,
                        user.userNm,
                        // Case when entity is null then 'N' else value
                        userAbsence.userAbsnceAt.coalesce("N").as("userAbsnceAt"),
                        // RegYn: if userAbsnceAt is null then N else Y
                        Expressions
                                .stringTemplate("CASE WHEN {0} IS NULL THEN 'N' ELSE 'Y' END", userAbsence.userAbsnceAt)
                                .as("regYn"),
                        userAbsence.lastUpdusrId,
                        userAbsence.lastModifiedDate.as("lastUpdtPnttm")))
                .from(user)
                .leftJoin(userAbsence).on(user.userId.eq(userAbsence.userId))
                .where(builder)
                .orderBy(userAbsence.lastModifiedDate.desc().nullsLast()) // Order by modified date desc
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long count = queryFactory
                .select(user.count())
                .from(user)
                .leftJoin(userAbsence).on(user.userId.eq(userAbsence.userId))
                .where(builder)
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable),
                count != null ? count : 0L);
    }
}