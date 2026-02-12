package com.company.project.domain.dam;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;

import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface KnowledgeInfRepository
                extends JpaRepository<KnowledgeInf, String>, QuerydslPredicateExecutor<KnowledgeInf>,
                JpaSpecificationExecutor<KnowledgeInf>,
                KnowledgeInfRepositoryCustom {
}
