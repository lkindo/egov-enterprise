package com.company.project.domain.consult;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CnsltManageRepository extends JpaRepository<CnsltManage, String> {
}
