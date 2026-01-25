package com.company.project.domain.duty;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DutyRepository extends JpaRepository<Duty, Duty.DutyId> {
    List<Duty> findById_BndtDeStartingWith(String bndtDePrefix);
    Page<Duty> findById_BndtDeStartingWith(String bndtDePrefix, Pageable pageable);
}
