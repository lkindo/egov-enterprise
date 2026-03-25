package com.company.project.business.domain.board;

import org.springframework.data.jpa.repository.JpaRepository;

public interface BlogUserRepository extends JpaRepository<BlogUser, BlogUserId> {
}
