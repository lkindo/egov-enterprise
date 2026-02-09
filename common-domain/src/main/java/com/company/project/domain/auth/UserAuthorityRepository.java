package com.company.project.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAuthorityRepository extends JpaRepository<UserAuthority, String>, UserAuthorityRepositoryCustom {
}
