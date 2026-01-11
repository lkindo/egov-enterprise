package com.company.project.domain.notification;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CtsnnManageRepository extends JpaRepository<CtsnnManage, String> {
}
