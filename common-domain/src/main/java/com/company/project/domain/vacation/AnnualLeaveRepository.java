package com.company.project.domain.vacation;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AnnualLeaveRepository extends JpaRepository<AnnualLeave, AnnualLeave.AnnualLeaveId> {
    Page<AnnualLeave> findByIdOccrrncYear(String occrrncYear, Pageable pageable);

    // Search by User Name? Need Join or assume fetch by service.
    // Legacy searches by User Name pattern.
    // Assuming we can't join easily without User entity ref in domain, we'll keep
    // it simple for now or fetch all and filter (not efficient).
    // Or we use findByIdUserId if searching by ID.
    Page<AnnualLeave> findByIdOccrrncYearAndIdUserIdContaining(String occrrncYear, String userId, Pageable pageable);
}
