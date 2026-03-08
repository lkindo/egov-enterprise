package com.company.project.domain.digitalassetmanagement;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Objects;

/**
 * 지식맵 Repository Custom 구현체
 */
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
                // 조직명 검색
                predicate.and(mapTeam.organizationName.contains(searchKeyword));
            } else if ("2".equals(searchCondition)) {
                // 지식유형명 검색
                predicate.and(mapKno.typeName.contains(searchKeyword));
            }
        }

        List<MapKnoSearchResult> content = queryFactory
                .select(Projections.constructor(MapKnoSearchResult.class,
                        mapKno.typeCode,
                        mapKno.typeName,
                        mapTeam.organizationName,
                        mapKno.expertId,
                        mapKno.knowledgeUrl,
                        mapKno.classificationDate,
                        mapKno.createdBy,
                        mapKno.createdDate))
                .from(mapKno)
                .join(mapTeam).on(mapKno.organizationId.eq(mapTeam.organizationId))
                .where(predicate)
                .orderBy(mapKno.typeCode.asc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(mapKno.count())
                .from(mapKno)
                .join(mapTeam).on(mapKno.organizationId.eq(mapTeam.organizationId))
                .where(predicate)
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }
}
