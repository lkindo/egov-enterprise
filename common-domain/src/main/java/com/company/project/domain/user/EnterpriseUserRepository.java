package com.company.project.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository("enterpriseUserDomainRepository")
public interface EnterpriseUserRepository
        extends JpaRepository<EnterpriseUser, String>, EnterpriseUserRepositoryCustom {
    Optional<EnterpriseUser> findByEntrprsmberId(String entrprsmberId);
}
