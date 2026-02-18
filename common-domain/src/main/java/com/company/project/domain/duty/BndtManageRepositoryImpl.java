package com.company.project.domain.duty;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;

/**
 * 당직 정보 Repository Custom 구현체
 */
@RequiredArgsConstructor
public class BndtManageRepositoryImpl implements BndtManageRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<BndtManage> searchBndtManageList(String bndtDe, Pageable pageable) {
        List<BndtManage> content = queryFactory
                .selectFrom(QBndtManage.bndtManage)
                .where(bndtDeContains(bndtDe))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(QBndtManage.bndtManage.createdDate.desc())
                .fetch();

        long total = queryFactory
                .select(QBndtManage.bndtManage.count())
                .from(QBndtManage.bndtManage)
                .where(bndtDeContains(bndtDe))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }

    private BooleanExpression bndtDeContains(String bndtDe) {
        return StringUtils.hasText(bndtDe) ? QBndtManage.bndtManage.bndtDe.contains(bndtDe) : null;
    }
}
