package com.company.project.domain.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * ??뿅??類ｋ궖 Repository
 */
public interface QestnrInfoRepository extends JpaRepository<QestnrInfo, String> {
    Page<QestnrInfo> findByQestnrSjContaining(String qestnrSj, Pageable pageable);
}