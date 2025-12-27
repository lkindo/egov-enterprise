package com.company.project.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MenuAuthorityRepository
        extends JpaRepository<MenuAuthority, MenuAuthority.MenuAuthorityId>, MenuAuthorityRepositoryCustom {
    void deleteByIdAuthorCode(String authorCode);

    List<MenuAuthority> findByIdAuthorCode(String authorCode);
}
