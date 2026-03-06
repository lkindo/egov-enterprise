package com.company.project.domain.digitalassetmanagement;

import com.company.project.domain.user.entity.QUser;
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
 * 전문가 Repository Custom 구현체
 */
@Repository
@RequiredArgsConstructor
public class ProfessionalRepositoryImpl implements ProfessionalRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<ProfessionalSearchResult> searchProfessionals(String searchCondition, String searchKeyword,
            Pageable pageable) {
        QProfessional professional = QProfessional.professional;
        QMapKno mapKno = QMapKno.mapKno;
        QMapTeam mapTeam = QMapTeam.mapTeam;
        QUser user = QUser.user;

        BooleanBuilder predicate = new BooleanBuilder();

        if (searchKeyword != null && !searchKeyword.isEmpty()) {
            if ("1".equals(searchCondition)) {
                // 사용자명 검색
                predicate.and(user.userNm.contains(searchKeyword));
            } else if ("2".equals(searchCondition)) {
                // 지식유형명 검색
                predicate.and(mapKno.typeName.contains(searchKeyword));
            }
        }

        List<ProfessionalSearchResult> content = queryFactory
                .select(Projections.constructor(ProfessionalSearchResult.class,
                        mapTeam.organizationName,
                        mapKno.typeCode,
                        mapKno.typeName,
                        user.userNm,
                        professional.assessmentLevel,
                        professional.confirmedDate,
                        professional.expertId,
                        professional.createdBy,
                        professional.createdDate))
                .from(professional)
                .join(mapKno).on(professional.typeCode.eq(mapKno.typeCode))
                .join(mapTeam).on(mapKno.organizationId.eq(mapTeam.organizationId))
                .join(user).on(professional.expertId.eq(user.esntlId))
                .where(predicate)
                .orderBy(professional.expertId.asc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(professional.count())
                .from(professional)
                .join(mapKno).on(professional.typeCode.eq(mapKno.typeCode))
                .join(mapTeam).on(mapKno.organizationId.eq(mapTeam.organizationId))
                .join(user).on(professional.expertId.eq(user.esntlId))
                .where(predicate)
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }
}
