package com.company.project.domain.duty;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DutyCheckRepository extends JpaRepository<DutyCheck, DutyCheck.DutyCheckId> {
    List<DutyCheck> findByUseAt(String useAt);
}
