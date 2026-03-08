package com.company.project.domain.trouble;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static com.company.project.domain.trouble.QTrobl.trobl;

@RequiredArgsConstructor
public class TroblRepositoryImpl implements TroblRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<Trobl> searchTroblReqsts(String troblNm, String troblKnd, List<String> processStatuses,
            Pageable pageable) {
        BooleanBuilder builder = new BooleanBuilder();

        if (StringUtils.hasText(troblNm)) {
            builder.and(trobl.troblNm.contains(troblNm));
        }

        if (StringUtils.hasText(troblKnd) && !"00".equals(troblKnd)) {
            builder.and(trobl.troblKnd.eq(troblKnd));
        }

        if (processStatuses != null && !processStatuses.isEmpty()) {
            builder.and(trobl.processSttus.in(processStatuses));
        }

        List<Trobl> content = queryFactory
                .selectFrom(trobl)
                .where(builder)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(trobl.troblId.asc())
                .fetch();

        long total = queryFactory
                .select(trobl.count())
                .from(trobl)
                .where(builder)
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }
}
