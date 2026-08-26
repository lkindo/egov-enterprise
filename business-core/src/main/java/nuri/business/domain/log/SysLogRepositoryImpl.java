package nuri.business.domain.log;

import nuri.business.domain.code.QCommonCode;
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
public class SysLogRepositoryImpl implements SysLogRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @jakarta.persistence.PersistenceContext
    private final EntityManager entityManager;

    @Override
    public Page<SysLog> searchSysLogs(String searchWrd, String searchBgnDe, String searchEndDe, Pageable pageable) {
        QCommonCode commonCode = QCommonCode.commonCode;

        List<SysLog> content = queryFactory
                .selectFrom(QSysLog.sysLog)
                .leftJoin(commonCode).on(QSysLog.sysLog.prcsSeCd.trim().eq(commonCode.dtlCd)
                        .and(commonCode.cdId.eq("COM033")))
                .where(
                        processSeCodeNmLike(searchWrd, commonCode),
                        occrrncDeBetween(searchBgnDe, searchEndDe))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(QSysLog.sysLog.ocrnYmd.desc())
                .fetch();

        JPAQuery<Long> countQuery = queryFactory
                .select(QSysLog.sysLog.count())
                .from(QSysLog.sysLog)
                .leftJoin(commonCode).on(QSysLog.sysLog.prcsSeCd.trim().eq(commonCode.dtlCd)
                        .and(commonCode.cdId.eq("COM033")))
                .where(
                        processSeCodeNmLike(searchWrd, commonCode),
                        occrrncDeBetween(searchBgnDe, searchEndDe));

        return PageableExecutionUtils.getPage(Objects.requireNonNull(content), Objects.requireNonNull(pageable),
                countQuery::fetchOne);
    }

    @Override
    @Transactional
    public void deleteOldLogs(int months) {
        String targetDe = LocalDate.now().minusMonths(months).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String sql = "DELETE FROM TB_SYS_LOG WHERE OCRN_YMD < :targetDe";
        entityManager.createNativeQuery(sql)
                .setParameter("targetDe", targetDe)
                .executeUpdate();
    }

    private BooleanExpression processSeCodeNmLike(String searchWrd, QCommonCode commonCode) {
        return StringUtils.hasText(searchWrd) ? commonCode.dtlCdNm.contains(searchWrd) : null;
    }

    /**
     * 발생일자 범위. {@code ocrnYmd} 는 8자리 문자열 컬럼이라 하이픈이 섞인 값을 그대로 비교하면
     * 조용히 빈 결과가 된다 — 두 형식을 모두 받아 8자리로 정규화하고, 해석 불가 값은 즉시 실패시킨다.
     */
    private BooleanExpression occrrncDeBetween(String searchBgnDe, String searchEndDe) {
        if (!StringUtils.hasText(searchBgnDe) || !StringUtils.hasText(searchEndDe)) {
            return null;
        }
        return QSysLog.sysLog.ocrnYmd.trim().between(
                LogSearchPeriod.toCompact(searchBgnDe, "searchKeywordFrom"),
                LogSearchPeriod.toCompact(searchEndDe, "searchKeywordTo"));
    }
}
