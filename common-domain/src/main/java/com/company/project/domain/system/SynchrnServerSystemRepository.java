package com.company.project.domain.system;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("synchrnServerSystemRepository")
public interface SynchrnServerSystemRepository extends JpaRepository<SynchrnServerSystem, String> {
    Page<SynchrnServerSystem> findByServerNmContaining(String serverNm, Pageable pageable);
}
