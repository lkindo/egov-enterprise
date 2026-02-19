package com.company.project.domain.user.repository;

import com.company.project.domain.user.entity.*;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository("enterpriseUserDomainRepository")
public interface EnterpriseUserRepository
        extends JpaRepository<EnterpriseUser, String>, EnterpriseUserRepositoryCustom {
    Optional<EnterpriseUser> findByEntrprsmberId(String entrprsmberId);

    Optional<EnterpriseUser> findByEsntlId(String esntlId);

    Optional<EnterpriseUser> findByCmpnyNmAndApplcntEmailAdres(String cmpnyNm, String applcntEmailAdres);

    Optional<EnterpriseUser> findByEntrprsmberIdAndCmpnyNmAndApplcntEmailAdres(String entrprsmberId, String cmpnyNm,
            String applcntEmailAdres);
}
