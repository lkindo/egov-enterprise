package com.company.project.domain.vacation;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface VacationRepository extends JpaRepository<Vacation, VacationId> {
    Page<Vacation> findByApplcntId(String applcntId, Pageable pageable);
}
