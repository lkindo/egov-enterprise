package com.company.project.domain.code;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

import static com.company.project.domain.code.QCommonCode.commonCode;

@RequiredArgsConstructor
public class CommonCodeRepositoryImpl implements CommonCodeRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<CommonCode> searchCommonCodes(String searchCondition, String searchKeyword, Pageable pageable) {
        List<CommonCode> content = queryFactory
                .selectFrom(commonCode)
                .where(
                        conditionEq(searchCondition, searchKeyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(commonCode.count())
                .from(commonCode)
                .where(
                        conditionEq(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(content, pageable, total);
    }

    private BooleanExpression conditionEq(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("1".equals(searchCondition)) {
            return commonCode.codeGroupId.eq(searchKeyword);
        } else if ("2".equals(searchCondition)) {
            return commonCode.code.contains(searchKeyword);
        } else if ("3".equals(searchCondition)) {
            return commonCode.codeNm.contains(searchKeyword);
        }

        return null;
    }
}
