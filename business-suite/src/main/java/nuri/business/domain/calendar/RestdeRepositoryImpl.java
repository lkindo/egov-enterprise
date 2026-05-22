package nuri.business.domain.calendar;

import com.querydsl.core.types.dsl.BooleanExpression;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static nuri.business.domain.calendar.QRestde.restde;

@RequiredArgsConstructor
public class RestdeRepositoryImpl implements RestdeRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<Restde> searchRestde(String searchCondition, String searchKeyword, Pageable pageable) {
        List<Restde> content = queryFactory
                .selectFrom(restde)
                .where(conditionEq(searchCondition, searchKeyword))
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(restde.hldyYmd.desc())
                .fetch();

        Long total = queryFactory
                .select(restde.count())
                .from(restde)
                .where(conditionEq(searchCondition, searchKeyword))
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable),
                total != null ? total.longValue() : 0L);
    }

    private BooleanExpression conditionEq(String searchCondition, String searchKeyword) {
        if (!StringUtils.hasText(searchKeyword)) {
            return null;
        }

        if ("1".equals(searchCondition)) { // 휴일일자
            return restde.hldyYmd.eq(searchKeyword);
        } else if ("2".equals(searchCondition)) { // 휴일명
            return restde.hldyNm.contains(searchKeyword);
        }

        return null;
    }
}
