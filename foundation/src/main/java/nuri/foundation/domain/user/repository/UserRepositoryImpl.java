package nuri.foundation.domain.user.repository;

import nuri.foundation.domain.user.entity.*;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import com.querydsl.core.types.Projections;
import nuri.foundation.service.user.dto.UserDto;

import static nuri.foundation.domain.user.entity.QUser.user;

@RequiredArgsConstructor
public class UserRepositoryImpl implements UserRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<UserDto> getPagedUserList(String searchKeyword, Pageable pageable) {
        BooleanExpression condition = null;
        if (StringUtils.hasText(searchKeyword)) {
            condition = user.userId.containsIgnoreCase(searchKeyword)
                    .or(user.userNm.containsIgnoreCase(searchKeyword));
        }

        List<UserDto> content = queryFactory
                .select(Projections.fields(UserDto.class,
                        user.userId,
                        user.userNm,
                        user.esntlId,
                        user.role.stringValue().as("role"),
                        user.emplNo,
                        user.officeTelno.as("officeTelno"),
                        user.mblTelno.as("mblTelno"),
                        user.emlAddr.as("emlAddr"),
                        user.ofcpsNm,
                        user.createdDate))
                .from(user)
                .where(condition)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(user.userId.asc())
                .fetch();

        long total = queryFactory
                .select(user.count())
                .from(user)
                .where(condition)
                .fetchOne();

        return new PageImpl<>(content, pageable, total);
    }

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
        return (int) queryFactory
                .select(user.count())
                .from(user)
                .where(user.userId.eq(checkId))
                .fetchOne().longValue();
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

        if ("0".equals(searchCondition) || "USER_ID".equals(searchCondition)) {
            return user.userId.contains(searchKeyword);
        } else if ("1".equals(searchCondition) || "USER_NM".equals(searchCondition)) {
            return user.userNm.contains(searchKeyword);
        } else if ("OFFM_TELNO".equals(searchCondition) || "OFFICE_TELNO".equals(searchCondition)) {
            return user.officeTelno.contains(searchKeyword);
        }

        return null;
    }
}
