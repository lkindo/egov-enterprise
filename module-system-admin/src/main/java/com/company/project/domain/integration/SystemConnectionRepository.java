package com.company.project.domain.integration;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SystemConnectionRepository
        extends JpaRepository<SystemConnection, String>, SystemConnectionRepositoryCustom {
}
