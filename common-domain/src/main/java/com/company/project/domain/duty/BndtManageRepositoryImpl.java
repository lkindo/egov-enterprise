package com.company.project.domain.duty;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

import static com.company.project.domain.duty.QBndtManage.bndtManage;

/**
 * 당직 정보 Repository Custom 구현체
 */
@RequiredArgsConstructor
public class BndtManageRepositoryImpl implements BndtManageRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<BndtManage> searchBndtManageList(String bndtDe, Pageable pageable) {
        List<BndtManage> content = queryFactory
                .selectFrom(bndtManage)
                .where(bndtDeContains(bndtDe))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(bndtManage.createdDate.desc())
                .fetch();

        long total = queryFactory
                .select(bndtManage.count())
                .from(bndtManage)
                .where(bndtDeContains(bndtDe))
                .fetchOne();

        return new PageImpl<>(content, pageable, total);
    }

    private BooleanExpression bndtDeContains(String bndtDe) {
        return StringUtils.hasText(bndtDe) ? bndtManage.bndtDe.contains(bndtDe) : null;
    }
}
