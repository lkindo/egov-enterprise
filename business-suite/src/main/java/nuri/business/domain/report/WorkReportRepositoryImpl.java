package nuri.business.domain.report;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;

import static nuri.business.domain.report.QWorkReport.workReport;

public class WorkReportRepositoryImpl implements WorkReportRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public WorkReportRepositoryImpl(EntityManager em) {
        this.queryFactory = new JPAQueryFactory(em);
    }

    @Override
    public Page<WorkReport> searchWorkReports(String searchId, String searchDe, String searchBgnDe, String searchEndDe,
            String searchCnd, String searchWrd, String searchSttus, String searchSe, Pageable pageable) {
        BooleanBuilder builder = new BooleanBuilder();

        if (StringUtils.hasText(searchId)) {
            builder.and(workReport.wrterId.eq(searchId)); 
        }

        if (StringUtils.hasText(searchSe)) {
            builder.and(workReport.reprtSe.eq(searchSe));
        }

        if (StringUtils.hasText(searchWrd)) {
            builder.and(workReport.reportSubject.contains(searchWrd));
        }

        List<WorkReport> results = queryFactory
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

        return new PageImpl<>(Objects.requireNonNull(results), pageable, total);
    }
}
