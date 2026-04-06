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
import static nuri.foundation.domain.user.entity.QEnterpriseUser.enterpriseUser;

@RequiredArgsConstructor
public class EnterpriseUserRepositoryImpl implements EnterpriseUserRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<EnterpriseUser> searchEnterpriseUsers(String sbscrbSttus, String searchCondition, String searchKeyword,
            Pageable pageable) {
        List<EnterpriseUser> content = queryFactory
                .selectFrom(enterpriseUser)
                .where(
                        statusEq(sbscrbSttus),
                        conditionEq(searchCondition, searchKeyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(enterpriseUser.sbscrbDe.desc())
                .fetch();

        long total = queryFactory
                .select(enterpriseUser.count())
                .from(enterpriseUser)
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
        return enterpriseUser.entrprsMberSttus.eq(sbscrbSttus);
    }

    private BooleanExpression conditionEq(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("0".equals(searchCondition)) {
            return enterpriseUser.entrprsmberId.contains(searchKeyword);
        } else if ("1".equals(searchCondition)) {
            return enterpriseUser.applcntNm.contains(searchKeyword);
        }

        return null;
    }
}
