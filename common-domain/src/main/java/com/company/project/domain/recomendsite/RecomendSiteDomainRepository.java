package com.company.project.domain.recomendsite;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RecomendSiteDomainRepository extends JpaRepository<RecomendSite, String> {
}