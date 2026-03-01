package com.company.project.domain.digitalassetmanagement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface KnowledgeRequestRepository
        extends JpaRepository<KnowledgeRequest, String>, QuerydslPredicateExecutor<KnowledgeRequest>,
        KnowledgeRequestRepositoryCustom {
    long countByAnsParents(String ansParents);
}
