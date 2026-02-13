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
public class KnowledgeInfRepositoryImpl implements KnowledgeInfRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<KnowledgeInfSearchResult> searchKnowledgeInf(String searchCondition, String searchKeyword,
            Pageable pageable) {
        QKnowledgeInf knowledgeInf = QKnowledgeInf.knowledgeInf;
        QMapKno mapKno = QMapKno.mapKno;
        QMapTeam mapTeam = QMapTeam.mapTeam;
        QUser user = QUser.user;

        BooleanBuilder predicate = new BooleanBuilder();
        predicate.and(knowledgeInf.othbcAt.eq("Y"));
        predicate.and(knowledgeInf.knoAps.eq("1"));

        if (searchKeyword != null && !searchKeyword.isEmpty()) {
            if ("1".equals(searchCondition)) {
                predicate.and(knowledgeInf.knoNm.contains(searchKeyword));
            } else if ("2".equals(searchCondition)) {
                predicate.and(user.userNm.contains(searchKeyword));
            }
        }

        List<KnowledgeInfSearchResult> content = queryFactory
                .select(Projections.constructor(KnowledgeInfSearchResult.class,
                        knowledgeInf.knoId,
                        knowledgeInf.knoNm,
                        mapTeam.orgnztNm,
                        mapKno.knoTypeNm,
                        user.userNm,
                        knowledgeInf.appYmd,
                        knowledgeInf.frstRegisterId,
                        knowledgeInf.frstRegisterPnttm))
                .from(knowledgeInf)
                .join(mapKno).on(knowledgeInf.knoTypeCd.eq(mapKno.knoTypeCd))
                .join(mapTeam).on(mapKno.orgnztId.eq(mapTeam.orgnztId))
                .leftJoin(user).on(knowledgeInf.frstRegisterId.eq(user.esntlId))
                .where(predicate)
                .orderBy(knowledgeInf.frstRegisterPnttm.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(knowledgeInf.count())
                .from(knowledgeInf)
                .leftJoin(user).on(knowledgeInf.frstRegisterId.eq(user.esntlId))
                .where(predicate)
                .fetchOne();

        return new PageImpl<>(content, pageable, total);
    }
}
