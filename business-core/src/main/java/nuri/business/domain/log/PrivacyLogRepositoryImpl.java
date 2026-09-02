package nuri.business.domain.log;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Objects;

@RequiredArgsConstructor
public class PrivacyLogRepositoryImpl implements PrivacyLogRepositoryCustom {

        private final JPAQueryFactory queryFactory;

        /**
         * 형제 저장소({@code WebLogRepositoryImpl} 등)는 {@code yyyyMMdd} 문자열 컬럼을 비교하지만
         * 이 테이블의 조회 시각({@code inq_dt})은 timestamp 다. 문자열 절단 없이 시각으로 비교한다.
         */
        @Override
        @Transactional
        public void deleteOldLogs(int months) {
                LocalDateTime cutoff = LocalDateTime.now().minusMonths(months);
                queryFactory.delete(QPrivacyLog.privacyLog)
                                .where(QPrivacyLog.privacyLog.inqDt.lt(cutoff))
                                .execute();
        }

        @Override
        public Page<PrivacyLog> searchPrivacyLogs(String searchWrd, String searchBgnDe, String searchEndDe,
                        Pageable pageable) {
                List<PrivacyLog> content = queryFactory
                                .selectFrom(QPrivacyLog.privacyLog)
                                .where(
                                                inquiryInfoLike(searchWrd),
                                                inquiryDatetimeBetween(searchBgnDe, searchEndDe))
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .orderBy(
                                                QPrivacyLog.privacyLog.inqDt.desc(),
                                                QPrivacyLog.privacyLog.prvcLogSn.desc())
                                .fetch();

                long total = queryFactory
                                .select(QPrivacyLog.privacyLog.count())
                                .from(QPrivacyLog.privacyLog)
                                .where(
                                                inquiryInfoLike(searchWrd),
                                                inquiryDatetimeBetween(searchBgnDe, searchEndDe))
                                .fetchOne();

                return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
        }

        private BooleanExpression inquiryInfoLike(String searchWrd) {
                return StringUtils.hasText(searchWrd) ? QPrivacyLog.privacyLog.inqInfo.contains(searchWrd) : null;
        }

        private BooleanExpression inquiryDatetimeBetween(String searchBgnDe, String searchEndDe) {
                if (!StringUtils.hasText(searchBgnDe) || !StringUtils.hasText(searchEndDe)) {
                        return null;
                }
                /*
                 * [2026-08-26] 종전에는 yyyy-MM-dd 만 파싱하고 실패를 catch 로 삼켜 조건을 null 로
                 * 만들었다 — 8자리 값이 오면 필터가 통째로 무시된 채 전체 결과가 나갔다.
                 * 개인정보 조회 이력에서 이 실패는 특히 위험하다(좁혔다고 믿고 전체를 본다).
                 */
                LocalDateTime start = LogSearchPeriod.toLocalDate(searchBgnDe, "searchKeywordFrom").atStartOfDay();
                LocalDateTime end = LogSearchPeriod.toLocalDate(searchEndDe, "searchKeywordTo").atTime(LocalTime.MAX);
                return QPrivacyLog.privacyLog.inqDt.between(start, end);
        }
}
