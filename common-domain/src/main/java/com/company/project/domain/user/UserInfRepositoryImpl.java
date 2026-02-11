package com.company.project.domain.user;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import org.springframework.util.StringUtils;

import java.util.List;

import static com.company.project.domain.user.QUser.user;
import static com.company.project.domain.community.QCommunityUser.communityUser;

@Repository
@RequiredArgsConstructor
public class UserInfRepositoryImpl implements UserInfRepository {

        private final JPAQueryFactory queryFactory;

        @Override
        public Page<UserInfSearchResult> selectUserList(String searchCondition, String searchKeyword,
                        Pageable pageable) {
                // eGovFrame's UserInf usually maps to multiple user types.
                // For now, we use NEMPLYRINFO (User entity) as the primary source.
                List<UserInfSearchResult> content = queryFactory
                                .select(Projections.fields(UserInfSearchResult.class,
                                                user.esntlId.as("uniqId"),
                                                user.userId,
                                                user.userNm,
                                                user.zip.as("userZip"),
                                                user.homeadres.as("userAdres"),
                                                user.emailAdres.as("userEmail")))
                                .from(user)
                                .where(conditionEq(searchCondition, searchKeyword))
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .orderBy(user.userNm.asc())
                                .fetch();

                long total = queryFactory
                                .select(user.count())
                                .from(user)
                                .where(conditionEq(searchCondition, searchKeyword))
                                .fetchOne();

                return new PageImpl<>(content, pageable, total);
        }

        @Override
        public Page<UserInfSearchResult> selectCmmntyUserList(String trgetId, String searchCondition,
                        String searchKeyword,
                        Pageable pageable) {
                List<UserInfSearchResult> content = queryFactory
                                .select(Projections.fields(UserInfSearchResult.class,
                                                user.esntlId.as("uniqId"),
                                                user.userId,
                                                user.userNm,
                                                user.zip.as("userZip"),
                                                user.homeadres.as("userAdres"),
                                                user.emailAdres.as("userEmail"),
                                                communityUser.useAt))
                                .from(user)
                                .join(communityUser).on(user.esntlId.eq(communityUser.emplyrId))
                                .where(
                                                communityUser.cmmntyId.eq(trgetId),
                                                conditionEq(searchCondition, searchKeyword))
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .orderBy(user.userNm.asc())
                                .fetch();

                long total = queryFactory
                                .select(user.count())
                                .from(communityUser)
                                .where(
                                                communityUser.cmmntyId.eq(trgetId))
                                .fetchOne();

                return new PageImpl<>(content, pageable, total);
        }

        @Override
        public Page<UserInfSearchResult> selectCmmntyMngrList(String trgetId, String searchCondition,
                        String searchKeyword,
                        Pageable pageable) {
                List<UserInfSearchResult> content = queryFactory
                                .select(Projections.fields(UserInfSearchResult.class,
                                                user.esntlId.as("uniqId"),
                                                user.userId,
                                                user.userNm,
                                                user.zip.as("userZip"),
                                                user.homeadres.as("userAdres"),
                                                user.emailAdres.as("userEmail"),
                                                communityUser.useAt))
                                .from(user)
                                .join(communityUser).on(user.esntlId.eq(communityUser.emplyrId))
                                .where(
                                                communityUser.cmmntyId.eq(trgetId),
                                                communityUser.mngrAt.eq("Y"),
                                                conditionEq(searchCondition, searchKeyword))
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .orderBy(user.userNm.asc())
                                .fetch();

                long total = queryFactory
                                .select(user.count())
                                .from(communityUser)
                                .where(
                                                communityUser.cmmntyId.eq(trgetId),
                                                communityUser.mngrAt.eq("Y"))
                                .fetchOne();

                return new PageImpl<>(content, pageable, total);
        }

        @Override
        public List<UserInfSearchResult> selectAllCmmntyUser(String trgetId) {
                return queryFactory
                                .select(Projections.fields(UserInfSearchResult.class,
                                                communityUser.emplyrId.as("uniqId"),
                                                communityUser.cmmntyId.as("trgetId")))
                                .from(communityUser)
                                .where(
                                                communityUser.cmmntyId.eq(trgetId),
                                                communityUser.useAt.eq("Y"))
                                .fetch();
        }

        private BooleanExpression conditionEq(String searchCondition, String searchKeyword) {
                if (!StringUtils.hasText(searchKeyword)) {
                        return null;
                }

                if ("0".equals(searchCondition) || "USER_NM".equals(searchCondition)) {
                        return user.userNm.contains(searchKeyword);
                }

                return null;
        }
}
