package com.company.project.domain.duty;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;

import static com.company.project.domain.duty.QBndtCeckManage.bndtCeckManage;

/**
 * 당직 체크 관리 Repository Custom 구현체
 */
@RequiredArgsConstructor
public class BndtCeckManageRepositoryImpl implements BndtCeckManageRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<BndtCeckManage> searchBndtCeckManageList(String bndtCeckSe, String useAt, String bndtCeckCdNm, Pageable pageable) {
        List<BndtCeckManage> content = queryFactory
                .selectFrom(bndtCeckManage)
                .where(
                        bndtCeckSeEq(bndtCeckSe),
                        useAtEq(useAt),
                        bndtCeckCdNmContains(bndtCeckCdNm)
                )
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(bndtCeckManage.createdDate.desc())
                .fetch();

        long total = queryFactory
                .select(bndtCeckManage.count())
                .from(bndtCeckManage)
                .where(
                        bndtCeckSeEq(bndtCeckSe),
                        useAtEq(useAt),
                        bndtCeckCdNmContains(bndtCeckCdNm)
                )
                .fetchOne();

        return new PageImpl<>(content, pageable, total);
    }

    private BooleanExpression bndtCeckSeEq(String bndtCeckSe) {
        return StringUtils.hasText(bndtCeckSe) ? bndtCeckManage.bndtCeckSe.eq(bndtCeckSe) : null;
    }

    private BooleanExpression useAtEq(String useAt) {
        return StringUtils.hasText(useAt) ? bndtCeckManage.useAt.eq(useAt) : null;
    }

    private BooleanExpression bndtCeckCdNmContains(String bndtCeckCdNm) {
        return StringUtils.hasText(bndtCeckCdNm) ? bndtCeckManage.bndtCeckCdNm.containsIgnoreCase(bndtCeckCdNm) : null;
    }
}
