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
 * ?諭彛?筌ｋ똾寃??온??Repository Custom ?닌뗭겱筌?
 */
@RequiredArgsConstructor
public class BndtCeckManageRepositoryImpl implements BndtCeckManageRepositoryCustom {

        private final JPAQueryFactory queryFactory;

        @Override
        public Page<BndtCeckManage> searchBndtCeckManageList(String bndtCeckSe, String useAt, String bndtCeckCdNm,
                        Pageable pageable) {
                List<BndtCeckManage> content = queryFactory
                                .selectFrom(QBndtCeckManage.bndtCeckManage)
                                .where(
                                                bndtCeckSeEq(bndtCeckSe),
                                                useAtEq(useAt),
                                                bndtCeckCdNmContains(bndtCeckCdNm))
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .orderBy(QBndtCeckManage.bndtCeckManage.createdDate.desc())
                                .fetch();

                long total = queryFactory
                                .select(QBndtCeckManage.bndtCeckManage.count())
                                .from(QBndtCeckManage.bndtCeckManage)
                                .where(
                                                bndtCeckSeEq(bndtCeckSe),
                                                useAtEq(useAt),
                                                bndtCeckCdNmContains(bndtCeckCdNm))
                                .fetchOne();

                return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
        }

        private BooleanExpression bndtCeckSeEq(String bndtCeckSe) {
                return StringUtils.hasText(bndtCeckSe) ? QBndtCeckManage.bndtCeckManage.bndtCeckSe.eq(bndtCeckSe)
                                : null;
        }

        private BooleanExpression useAtEq(String useAt) {
                return StringUtils.hasText(useAt) ? QBndtCeckManage.bndtCeckManage.useAt.eq(useAt) : null;
        }

        private BooleanExpression bndtCeckCdNmContains(String bndtCeckCdNm) {
                return StringUtils.hasText(bndtCeckCdNm)
                                ? QBndtCeckManage.bndtCeckManage.bndtCeckCdNm.containsIgnoreCase(bndtCeckCdNm)
                                : null;
        }
}
