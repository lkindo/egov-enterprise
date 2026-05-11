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
import static nuri.foundation.domain.log.QLoginLog.loginLog;

@RequiredArgsConstructor
public class LoginLogRepositoryImpl implements LoginLogRepositoryCustom {

    private final JPAQueryFactory queryFactory;
    private final EntityManager entityManager;

    @Override
    public Page<LoginLog> searchLoginLogs(String searchWrd, String searchBgnDe, String searchEndDe, Pageable pageable) {
        List<LoginLog> content = queryFactory
                .selectFrom(loginLog)
                .where(
                        loginMthdLike(searchWrd),
                        creatDtBetween(searchBgnDe, searchEndDe))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(loginLog.creatDt.desc())
                .fetch();

        JPAQuery<Long> countQuery = queryFactory
                .select(loginLog.count())
                .from(loginLog)
                .where(
                        loginMthdLike(searchWrd),
                        creatDtBetween(searchBgnDe, searchEndDe));

        return PageableExecutionUtils.getPage(Objects.requireNonNull(content), Objects.requireNonNull(pageable),
                countQuery::fetchOne);
    }

    private BooleanExpression loginMthdLike(String searchWrd) {
        return StringUtils.hasText(searchWrd) ? loginLog.loginMthd.contains(searchWrd) : null;
    }

    private BooleanExpression creatDtBetween(String searchBgnDe, String searchEndDe) {
        if (!StringUtils.hasText(searchBgnDe) || !StringUtils.hasText(searchEndDe)) {
            return null;
        }
        try {
            LocalDateTime start = LocalDate.parse(searchBgnDe, DateTimeFormatter.ofPattern("yyyyMMdd")).atStartOfDay();
            LocalDateTime end = LocalDate.parse(searchEndDe, DateTimeFormatter.ofPattern("yyyyMMdd"))
                    .atTime(LocalTime.MAX);
            return loginLog.creatDt.between(start, end);
        } catch (Exception e) {
            return null;
        }
    }

    @Override
    @Transactional
    public void deleteOldLogs(int months) {
        String targetDe = LocalDate.now().minusMonths(months).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String sql = "DELETE FROM NLOGINLOG WHERE TO_CHAR(CREAT_DT, 'YYYYMMDD') < :targetDe";
        entityManager.createNativeQuery(sql)
                .setParameter("targetDe", targetDe)
                .executeUpdate();
    }
}
