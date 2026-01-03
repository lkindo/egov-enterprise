package com.company.project.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface EnterpriseUserRepository
        extends JpaRepository<EnterpriseUser, String>, EnterpriseUserRepositoryCustom {
    Optional<EnterpriseUser> findByEntrprsmberId(String entrprsmberId);
}
