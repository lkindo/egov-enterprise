package com.company.project.foundation.domain.log;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserLogRepository extends JpaRepository<UserLog, UserLogId>, UserLogRepositoryCustom {
}
