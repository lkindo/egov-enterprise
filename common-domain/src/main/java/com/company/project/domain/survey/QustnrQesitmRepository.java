package com.company.project.domain.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 설문 문항 Repository
 */
public interface QustnrQesitmRepository extends JpaRepository<QustnrQesitm, String> {
    Page<QustnrQesitm> findByQestnrId(String qestnrId, Pageable pageable);
    List<QustnrQesitm> findByQestnrIdOrderByQestnSnAsc(String qestnrId);
}
