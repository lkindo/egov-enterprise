package com.company.project.business.domain.report;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static com.company.project.business.domain.report.QWorkReport.workReport;

@RequiredArgsConstructor
public class WorkReportRepositoryImpl implements WorkReportRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<WorkReport> searchWorkReports(String searchId, String searchDe, String searchBgnDe, String searchEndDe,
            String searchCnd, String searchWrd, String searchSttus, String searchSe, Pageable pageable) {
        BooleanBuilder builder = new BooleanBuilder();

        if (StringUtils.hasText(searchId)) {
            builder.and(workReport.writerId.eq(searchId)); // Simplified for now
        }

        if (StringUtils.hasText(searchSe) && !"0".equals(searchSe)) {
            builder.and(workReport.reportType.eq(searchSe));
        }

        if (StringUtils.hasText(searchWrd)) {
            if ("0".equals(searchCnd)) {
                builder.and(workReport.reportSubject.contains(searchWrd));
            }
        }

        List<WorkReport> content = queryFactory
                .selectFrom(workReport)
                .where(builder)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(workReport.reportId.desc())
                .fetch();

        long total = queryFactory
                .select(workReport.count())
                .from(workReport)
                .where(builder)
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }
}
