package com.company.project.domain.code;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

import static com.company.project.domain.code.QCommonCodeGroup.commonCodeGroup;

@RequiredArgsConstructor
public class CommonCodeGroupRepositoryImpl implements CommonCodeGroupRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<CommonCodeGroup> searchCommonCodeGroups(String searchCondition, String searchKeyword,
            Pageable pageable) {
        List<CommonCodeGroup> content = queryFactory
                .selectFrom(commonCodeGroup)
                .where(
                        conditionEq(searchCondition, searchKeyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(commonCodeGroup.count())
                .from(commonCodeGroup)
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
            return commonCodeGroup.codeId.contains(searchKeyword);
        } else if ("2".equals(searchCondition)) {
            return commonCodeGroup.codeIdNm.contains(searchKeyword);
        } else if ("clCode".equals(searchCondition)) {
            return commonCodeGroup.clCode.eq(searchKeyword);
        }

        return null;
    }
}
