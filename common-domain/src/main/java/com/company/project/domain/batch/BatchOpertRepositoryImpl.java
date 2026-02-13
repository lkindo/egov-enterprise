package com.company.project.domain.batch;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

// import static com.company.project.domain.batch.QBatchOpert.batchOpert;

/**
 * 배치작업 Repository Custom 구현체
 */
@RequiredArgsConstructor
public class BatchOpertRepositoryImpl implements BatchOpertRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<BatchOpert> searchBatchOperts(String searchCondition, String searchKeyword, Pageable pageable) {
        return new PageImpl<>(java.util.Collections.emptyList(), pageable, 0);
    }
}
