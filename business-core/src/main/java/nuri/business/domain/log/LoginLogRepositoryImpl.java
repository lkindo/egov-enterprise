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
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Objects;
import static nuri.business.domain.log.QLoginLog.loginLog;

@RequiredArgsConstructor
public class LoginLogRepositoryImpl implements LoginLogRepositoryCustom {

    private final JPAQueryFactory queryFactory;
    private final EntityManager entityManager;

    @Override
    public Page<LoginLog> searchLoginLogs(String searchWrd, String searchBgnDe, String searchEndDe, Pageable pageable) {
        List<LoginLog> content = queryFactory
                .selectFrom(loginLog)
                .where(
                        searchWordLike(searchWrd),
                        creatDtBetween(searchBgnDe, searchEndDe))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(loginLog.crtDt.desc())
                .fetch();

        JPAQuery<Long> countQuery = queryFactory
                .select(loginLog.count())
                .from(loginLog)
                .where(
                        searchWordLike(searchWrd),
                        creatDtBetween(searchBgnDe, searchEndDe));

        return PageableExecutionUtils.getPage(Objects.requireNonNull(content), Objects.requireNonNull(pageable),
                countQuery::fetchOne);
    }

    /**
     * 검색어 술어.
     *
     * <p>[2026-08-29] 종전에는 {@code cntnMthdCd}(접속 방법 코드)를 검색했다. 그런데 화면은
     * '사용자ID · 접속IP' 로 검색된다고 안내한다 — 두 축 모두 컬럼이 실재하는데도 어느 쪽도
     * 걸리지 않아, 관리자가 계정이나 IP 를 넣으면 언제나 0건이 나왔다. 오류가 아니라 빈 결과라
     * "그 계정의 접속 기록이 없다" 로 잘못 읽힌다 — 보안 조사에서 가장 나쁜 오독이다.
     *
     * <p>화면이 약속한 두 축을 그대로 검색한다. 접속 방법 코드는 화면에 검색 축으로 안내된 적이
     * 없으므로 승계하지 않는다.
     */
    private BooleanExpression searchWordLike(String searchWrd) {
        if (!StringUtils.hasText(searchWrd)) return null;
        return loginLog.userId.contains(searchWrd)
                .or(loginLog.lgnIpAddr.contains(searchWrd));
    }

    private BooleanExpression creatDtBetween(String searchBgnDe, String searchEndDe) {
        if (!StringUtils.hasText(searchBgnDe) || !StringUtils.hasText(searchEndDe)) {
            return null;
        }
        /*
         * [2026-08-26] 종전에는 yyyyMMdd 만 파싱하고 실패를 catch 로 삼켜 조건을 null 로 만들었다.
         * 그 결과 하이픈이 섞인 값이 오면 **필터가 통째로 무시된 채 전체 결과**가 나갔다 —
         * 화면은 기간을 좁혔다고 표시하는데 실제로는 아니었다는 뜻이라, 감사 조회에서 가장 위험한
         * 실패 형태다. 두 형식을 모두 받아들이고, 해석 불가 값은 조용히 버리지 않고 실패시킨다.
         */
        LocalDateTime start = LogSearchPeriod.toLocalDate(searchBgnDe, "searchKeywordFrom").atStartOfDay();
        LocalDateTime end = LogSearchPeriod.toLocalDate(searchEndDe, "searchKeywordTo").atTime(LocalTime.MAX);
        return loginLog.crtDt.between(start, end);
    }

    @Override
    @Transactional
    public void deleteOldLogs(int months) {
        // sargable 정정: TO_CHAR(CRT_DT,...) 함수 적용은 인덱스/스캔 최적화를 막는다. 컬럼 원형(timestamp)을
        // 컷오프 시각과 직접 비교한다(경계 시맨틱 동일 — 만료월 시작시각 이전 = 기존 YMD 문자열 비교와 일치).
        LocalDateTime cutoffTs = LocalDate.now().minusMonths(months).atStartOfDay();
        String sql = "DELETE FROM TB_LOGIN_LOG WHERE CRT_DT < :cutoffTs";
        entityManager.createNativeQuery(sql)
                .setParameter("cutoffTs", cutoffTs)
                .executeUpdate();
    }
}
