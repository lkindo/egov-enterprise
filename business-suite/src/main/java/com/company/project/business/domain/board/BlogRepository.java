package com.company.project.business.domain.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;

public interface BlogRepository extends JpaRepository<Blog, String>, QuerydslPredicateExecutor<Blog> {
    boolean existsByCreatedBy(String createdBy);
}
