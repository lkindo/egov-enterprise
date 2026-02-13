package com.company.project.domain.dam;

import com.company.project.domain.user.QUser;
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
                predicate.and(user.userNm.contains(searchKeyword));
            } else if ("2".equals(searchCondition)) {
                predicate.and(mapKno.knoTypeNm.contains(searchKeyword));
            }
        }

        List<ProfessionalSearchResult> content = queryFactory
                .select(Projections.constructor(ProfessionalSearchResult.class,
                        mapTeam.orgnztNm,
                        mapKno.knoTypeCd,
                        mapKno.knoTypeNm,
                        user.userNm,
                        professional.appTypeCd,
                        professional.speConfmDe,
                        professional.speId,
                        professional.frstRegisterId,
                        professional.frstRegisterPnttm))
                .from(professional)
                .join(mapKno).on(professional.knoTypeCd.eq(mapKno.knoTypeCd))
                .join(mapTeam).on(mapKno.orgnztId.eq(mapTeam.orgnztId))
                .join(user).on(professional.speId.eq(user.esntlId))
                .where(predicate)
                .orderBy(professional.speId.asc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(professional.count())
                .from(professional)
                .join(mapKno).on(professional.knoTypeCd.eq(mapKno.knoTypeCd))
                .join(mapTeam).on(mapKno.orgnztId.eq(mapTeam.orgnztId))
                .join(user).on(professional.speId.eq(user.esntlId))
                .where(predicate)
                .fetchOne();

        return new PageImpl<>(content, pageable, total);
    }
}
