package com.company.project.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface DeptManageRepository extends JpaRepository<DeptManage, String> {
}
