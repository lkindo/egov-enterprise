package com.company.project.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface AuthorityRoleRepository
        extends JpaRepository<AuthorityRole, AuthorityRole.AuthorityRoleId>, AuthorityRoleRepositoryCustom {
    void deleteByIdAuthorCode(String authorCode);

    List<AuthorityRole> findByIdAuthorCode(String authorCode);
}
