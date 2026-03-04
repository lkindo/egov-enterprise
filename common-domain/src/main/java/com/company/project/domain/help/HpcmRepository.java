package com.company.project.domain.help;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ?袁?筌?Repository
 */
public interface HpcmRepository extends JpaRepository<Hpcm, String> {
    Page<Hpcm> findByHpcmDfContaining(String hpcmDf, Pageable pageable);
}