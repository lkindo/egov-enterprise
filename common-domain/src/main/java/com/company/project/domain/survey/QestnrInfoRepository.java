package com.company.project.domain.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 설문 정보 Repository
 */
public interface QestnrInfoRepository extends JpaRepository<QestnrInfo, String> {
    Page<QestnrInfo> findByQestnrSjContaining(String qestnrSj, Pageable pageable);
}
