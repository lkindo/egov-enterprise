package com.company.project.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WebLogRepository extends JpaRepository<WebLog, String>, WebLogRepositoryCustom {
}