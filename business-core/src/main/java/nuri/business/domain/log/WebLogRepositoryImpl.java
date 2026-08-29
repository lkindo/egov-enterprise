package nuri.business.domain.log;

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
                        searchWordLike(searchWrd),
                        occrrncDeBetween(searchBgnDe, searchEndDe))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(QWebLog.webLog.occrYmd.desc(), QWebLog.webLog.webLogSn.desc())
                .fetch();

        JPAQuery<Long> countQuery = queryFactory
                .select(QWebLog.webLog.count())
                .from(QWebLog.webLog)
                .where(
                        searchWordLike(searchWrd),
                        occrrncDeBetween(searchBgnDe, searchEndDe));

        return PageableExecutionUtils.getPage(Objects.requireNonNull(content), Objects.requireNonNull(pageable),
                countQuery::fetchOne);
    }

    /**
     * 검색어 술어.
     *
     * <p>[2026-08-29] 종전에는 {@code url} 만 검색했다. 화면은 'URL · IP' 로 두 축을 안내하고
     * 표에 '요청자IP' 열을 함께 보여 주므로, 관리자가 IP 를 붙여 넣으면 언제나 0건이었다.
     * 안내한 두 축을 그대로 검색한다.
     */
    private BooleanExpression searchWordLike(String searchWrd) {
        if (!StringUtils.hasText(searchWrd)) return null;
        return QWebLog.webLog.url.contains(searchWrd)
                .or(QWebLog.webLog.dmndUserIpAddr.contains(searchWrd));
    }

    private BooleanExpression occrrncDeBetween(String searchBgnDe, String searchEndDe) {
        if (!StringUtils.hasText(searchBgnDe) || !StringUtils.hasText(searchEndDe)) {
            return null;
        }
        // 종전에는 하이픈만 제거해 형식 검증이 없었다 — 해석 불가 값이 그대로 비교에 들어가
        // 조용히 빈 결과를 만들었다.
        return QWebLog.webLog.occrYmd.between(
                LogSearchPeriod.toCompact(searchBgnDe, "searchKeywordFrom"),
                LogSearchPeriod.toCompact(searchEndDe, "searchKeywordTo"));
    }

    @Override
    @Transactional
    public void deleteOldLogs(int months) {
        String targetDe = LocalDate.now().minusMonths(months).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String sql = "DELETE FROM TB_WEB_LOG WHERE OCCR_YMD < :targetDe";
        entityManager.createNativeQuery(sql)
                .setParameter("targetDe", targetDe)
                .executeUpdate();
    }
}
