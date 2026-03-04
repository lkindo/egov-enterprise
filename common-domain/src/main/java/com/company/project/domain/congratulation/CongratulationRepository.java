package com.company.project.domain.congratulation;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 경조사(Congratulation/Condolence) 레포지토리
 */
@Repository
public interface CongratulationRepository extends JpaRepository<Congratulation, String> {
    Page<Congratulation> findByCongratulationNameContaining(String congratulationName, Pageable pageable);
}