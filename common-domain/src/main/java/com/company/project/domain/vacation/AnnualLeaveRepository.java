package com.company.project.domain.vacation;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AnnualLeaveRepository extends JpaRepository<AnnualLeave, AnnualLeaveId> {
    Page<AnnualLeave> findByOccrrncYear(String occrrncYear, Pageable pageable);
}