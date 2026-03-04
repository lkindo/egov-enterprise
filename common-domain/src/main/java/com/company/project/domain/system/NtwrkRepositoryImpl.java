package com.company.project.domain.system;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Objects;

import static com.company.project.domain.system.QNtwrk.ntwrk;

@RequiredArgsConstructor
public class NtwrkRepositoryImpl implements NtwrkRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<Ntwrk> searchNtwrks(String manageIem, String userNm, Pageable pageable) {
        BooleanBuilder builder = new BooleanBuilder();

        if (StringUtils.hasText(manageIem) && !"00".equals(manageIem)) {
            builder.and(ntwrk.manageIem.eq(manageIem));
        }

        if (StringUtils.hasText(userNm)) {
            builder.and(ntwrk.userNm.contains(userNm));
        }

        List<Ntwrk> content = queryFactory
                .selectFrom(ntwrk)
                .where(builder)
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .orderBy(ntwrk.ntwrkId.asc())
                .fetch();

        long total = queryFactory
                .select(ntwrk.count())
                .from(ntwrk)
                .where(builder)
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }
}
