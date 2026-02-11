package com.company.project.domain.batch;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

import static com.company.project.domain.batch.QBatchJob.batchJob;

@RequiredArgsConstructor
public class BatchJobRepositoryImpl implements BatchJobRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<BatchJob> search(String searchCondition, String searchKeyword, Pageable pageable) {
        List<BatchJob> content = queryFactory
                .selectFrom(batchJob)
                .where(batchJob.useAt.eq("Y"),
                        conditionEq(searchCondition, searchKeyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(batchJob.batchOpertId.asc())
                .fetch();

        long total = queryFactory
                .select(batchJob.count())
                .from(batchJob)
                .where(batchJob.useAt.eq("Y"),
                        conditionEq(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(content, pageable, total != null ? total : 0L);
    }

    private BooleanExpression conditionEq(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("0".equals(searchCondition)) {
            return batchJob.batchOpertNm.contains(searchKeyword);
        } else if ("1".equals(searchCondition)) {
            return batchJob.batchProgrm.contains(searchKeyword);
        }

        return null;
    }
}
