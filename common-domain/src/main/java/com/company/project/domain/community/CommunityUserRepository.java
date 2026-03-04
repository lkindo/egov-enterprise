package com.company.project.domain.community;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;

public interface CommunityUserRepository
        extends JpaRepository<CommunityUser, CommunityUserId>, QuerydslPredicateExecutor<CommunityUser> {
}