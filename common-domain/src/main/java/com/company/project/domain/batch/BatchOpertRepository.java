package com.company.project.domain.batch;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 獄쏄퀣??臾믩씜 Repository
 */
public interface BatchOpertRepository extends JpaRepository<BatchOpert, String>, BatchOpertRepositoryCustom {
}