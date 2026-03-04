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
 * 지식정보 Repository Custom 구현체
 */
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
        predicate.and(knowledgeInf.isPublic.eq("Y"));
        predicate.and(knowledgeInf.evaluationGrade.eq("1"));

        if (searchKeyword != null && !searchKeyword.isEmpty()) {
            if ("1".equals(searchCondition)) {
                // 제목 검색
                predicate.and(knowledgeInf.title.contains(searchKeyword));
            } else if ("2".equals(searchCondition)) {
                // 작성자(사용자명) 검색
                predicate.and(user.userNm.contains(searchKeyword));
            }
        }

        List<KnowledgeInfSearchResult> content = queryFactory
                .select(Projections.constructor(KnowledgeInfSearchResult.class,
                        knowledgeInf.knowledgeId,
                        knowledgeInf.title,
                        mapTeam.organizationName,
                        mapKno.typeName,
                        user.userNm,
                        knowledgeInf.evaluationDate,
                        knowledgeInf.createdBy,
                        knowledgeInf.createdDate))
                .from(knowledgeInf)
                .join(mapKno).on(knowledgeInf.typeCode.eq(mapKno.typeCode))
                .join(mapTeam).on(mapKno.organizationId.eq(mapTeam.organizationId))
                .leftJoin(user).on(knowledgeInf.createdBy.eq(user.esntlId))
                .where(predicate)
                .orderBy(knowledgeInf.createdDate.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(knowledgeInf.count())
                .from(knowledgeInf)
                .leftJoin(user).on(knowledgeInf.createdBy.eq(user.esntlId))
                .where(predicate)
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }
}