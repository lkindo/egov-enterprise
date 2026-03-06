package com.company.project.domain.digitalassetmanagement;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.jpa.impl.JPAQueryFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Objects;

/**
 * 지식요청 Repository Custom 구현체
 */
@Repository
@RequiredArgsConstructor
public class KnowledgeRequestRepositoryImpl implements KnowledgeRequestRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    @Override
    public Page<KnowledgeRequest> searchKnowledgeRequest(String searchCondition, String searchKeyword,
            Pageable pageable) {
        QKnowledgeRequest knowledgeRequest = QKnowledgeRequest.knowledgeRequest;

        BooleanBuilder predicate = new BooleanBuilder();

        if (searchKeyword != null && !searchKeyword.isEmpty()) {
            if ("A.KNWLDG_NM".equals(searchCondition)) {
                // 제목 검색
                predicate.and(knowledgeRequest.title.contains(searchKeyword));
            } else if ("A.KNWLDG_CN".equals(searchCondition)) {
                // 내용 검색
                predicate.and(knowledgeRequest.content.contains(searchKeyword));
            }
        }

        List<KnowledgeRequest> content = queryFactory
                .selectFrom(knowledgeRequest)
                .where(predicate)
                .orderBy(knowledgeRequest.answerGroupNumber.desc(), knowledgeRequest.answerOrder.asc(),
                        knowledgeRequest.answerDepth.asc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        long total = queryFactory
                .select(knowledgeRequest.count())
                .from(knowledgeRequest)
                .where(predicate)
                .fetchOne();

        return new PageImpl<>(Objects.requireNonNull(content), Objects.requireNonNull(pageable), total);
    }
}
