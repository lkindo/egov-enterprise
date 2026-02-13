package com.company.project.domain.batch;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 배치작업 Repository
 */
public interface BatchOpertRepository extends JpaRepository<BatchOpert, String>, BatchOpertRepositoryCustom {
}
