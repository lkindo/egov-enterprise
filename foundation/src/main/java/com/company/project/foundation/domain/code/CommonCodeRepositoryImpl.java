package com.company.project.foundation.domain.code;

import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static com.company.project.foundation.domain.code.QCommonCode.commonCode;
import static com.company.project.foundation.domain.code.QCommonCodeGroup.commonCodeGroup;

@RequiredArgsConstructor
public class CommonCodeRepositoryImpl implements CommonCodeRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<CommonCodeDetailProjection> searchCommonCodeDetails(String searchCondition, String searchKeyword,
            @NonNull Pageable pageable) {
        List<CommonCodeDetailProjection> content = queryFactory
                .select(Projections.constructor(CommonCodeDetailProjection.class,
                        commonCode.codeGroupId,
                        commonCodeGroup.codeIdNm,
                        commonCode.code,
                        commonCode.codeNm,
                        commonCode.codeDc,
                        commonCode.useAt))
                .from(commonCode)
                .join(commonCodeGroup).on(commonCode.codeGroupId.eq(commonCodeGroup.codeId))
                .where(
                        commonCodeGroup.useAt.eq("Y"),
                        conditionEq(searchCondition, searchKeyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(commonCode.count())
                .from(commonCode)
                .join(commonCodeGroup).on(commonCode.codeGroupId.eq(commonCodeGroup.codeId))
                .where(
                        commonCodeGroup.useAt.eq("Y"),
                        conditionEq(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    private BooleanExpression conditionEq(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("1".equals(searchCondition)) {
            return commonCode.codeGroupId.contains(searchKeyword);
        } else if ("2".equals(searchCondition)) {
            return commonCode.code.contains(searchKeyword);
        } else if ("3".equals(searchCondition)) {
            return commonCode.codeNm.contains(searchKeyword);
        }

        return null;
    }
}
