package com.company.project.foundation.domain.system.service.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * ??뿅臾먮뼗??Repository
 */
public interface SurveyRespondentRepository extends JpaRepository<SurveyRespondent, String> {

    Page<SurveyRespondent> findByQestnrId(String qestnrId, Pageable pageable);

    Page<SurveyRespondent> findByRespondNmContaining(String respondNm, Pageable pageable);

    @Query("SELECT s FROM SurveyRespondent s WHERE s.qestnrId = :qestnrId AND (s.respondNm LIKE %:keyword% OR s.sexdstnCode = :keyword)")
    Page<SurveyRespondent> searchByQestnrIdAndKeyword(@Param("qestnrId") String qestnrId,
            @Param("keyword") String keyword, Pageable pageable);
}
