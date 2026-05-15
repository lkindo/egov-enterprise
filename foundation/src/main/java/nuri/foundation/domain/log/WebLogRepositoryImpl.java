package nuri.foundation.domain.log;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.support.PageableExecutionUtils;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;

@RequiredArgsConstructor
public class WebLogRepositoryImpl implements WebLogRepositoryCustom {

    private final JPAQueryFactory queryFactory;
    private final EntityManager entityManager;

    @Override
    public Page<WebLog> searchWebLogs(String searchWrd, String searchBgnDe, String searchEndDe, Pageable pageable) {
        List<WebLog> content = queryFactory
                .selectFrom(QWebLog.webLog)
                .where(
                        urlLike(searchWrd),
                        occrrncDeBetween(searchBgnDe, searchEndDe))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(QWebLog.webLog.occrrncDe.desc())
                .fetch();

        JPAQuery<Long> countQuery = queryFactory
                .select(QWebLog.webLog.count())
                .from(QWebLog.webLog)
                .where(
                        urlLike(searchWrd),
                        occrrncDeBetween(searchBgnDe, searchEndDe));

        return PageableExecutionUtils.getPage(Objects.requireNonNull(content), Objects.requireNonNull(pageable),
                countQuery::fetchOne);
    }

    private BooleanExpression urlLike(String searchWrd) {
        return StringUtils.hasText(searchWrd) ? QWebLog.webLog.url.contains(searchWrd) : null;
    }

    private BooleanExpression occrrncDeBetween(String searchBgnDe, String searchEndDe) {
        if (!StringUtils.hasText(searchBgnDe) || !StringUtils.hasText(searchEndDe)) {
            return null;
        }
        try {
            LocalDateTime start = LocalDate.parse(searchBgnDe, DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                    .atStartOfDay();
            LocalDateTime end = LocalDate.parse(searchEndDe, DateTimeFormatter.ofPattern("yyyy-MM-dd"))
                    .atTime(LocalTime.MAX);
            return QWebLog.webLog.ocrnYmd.between(start, end);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    @Transactional
    public void deleteOldLogs(int months) {
        String targetDe = LocalDate.now().minusMonths(months).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String sql = "DELETE FROM TB_WEB_LOG WHERE TO_CHAR(OCCRRNC_DE, 'YYYYMMDD') < :targetDe";
        entityManager.createNativeQuery(sql)
                .setParameter("targetDe", targetDe)
                .executeUpdate();
    }
}
