package com.company.project.domain.digitalassetmanagement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;
import org.springframework.stereotype.Repository;

/**
 * 지식요청/답변 Repository
 */
@Repository
public interface KnowledgeRequestRepository
        extends JpaRepository<KnowledgeRequest, String>, QuerydslPredicateExecutor<KnowledgeRequest>,
        KnowledgeRequestRepositoryCustom {
    long countByParentKnowledgeId(String parentKnowledgeId);
}
