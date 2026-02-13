package com.company.project.domain.dam;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
@RequiredArgsConstructor
public class MapKnoRepositoryImpl implements MapKnoRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<MapKnoSearchResult> searchMapKno(String searchCondition, String searchKeyword, Pageable pageable) {
        QMapKno mapKno = QMapKno.mapKno;
        QMapTeam mapTeam = QMapTeam.mapTeam;

        BooleanBuilder predicate = new BooleanBuilder();

        if (searchKeyword != null && !searchKeyword.isEmpty()) {
            if ("1".equals(searchCondition)) {
                predicate.and(mapTeam.orgnztNm.contains(searchKeyword));
            } else if ("2".equals(searchCondition)) {
                predicate.and(mapKno.knoTypeNm.contains(searchKeyword));
            }
        }

        List<MapKnoSearchResult> content = queryFactory
                .select(Projections.constructor(MapKnoSearchResult.class,
                        mapKno.knoTypeCd,
                        mapKno.knoTypeNm,
                        mapTeam.orgnztNm,
                        mapKno.speId,
                        mapKno.knoUrl,
                        mapKno.clYmd,
                        mapKno.frstRegisterId,
                        mapKno.frstRegisterPnttm))
                .from(mapKno)
                .join(mapTeam).on(mapKno.orgnztId.eq(mapTeam.orgnztId))
                .where(predicate)
                .orderBy(mapKno.knoTypeCd.asc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(mapKno.count())
                .from(mapKno)
                .join(mapTeam).on(mapKno.orgnztId.eq(mapTeam.orgnztId))
                .where(predicate)
                .fetchOne();

        return new PageImpl<>(content, pageable, total);
    }
}
