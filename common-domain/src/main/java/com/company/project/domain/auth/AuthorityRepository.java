package com.company.project.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;

public interface AuthorityRepository extends JpaRepository<Authority, String>, AuthorityRepositoryCustom {
}
