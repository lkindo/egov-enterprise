package nuri.foundation.domain.system.service.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 설문 응답자 정보 Repository
 */
public interface SurveyRespondentRepository extends JpaRepository<SurveyRespondent, String> {

    Page<SurveyRespondent> findBySrvyId(String srvyId, Pageable pageable);

    Page<SurveyRespondent> findByRspdNmContaining(String rspdNm, Pageable pageable);

    @Query("SELECT s FROM SurveyRespondent s WHERE s.srvyId = :srvyId AND (s.rspdNm LIKE %:keyword% OR s.gndrCd = :keyword)")
    Page<SurveyRespondent> searchBySrvyIdAndKeyword(@Param("srvyId") String srvyId,
            @Param("keyword") String keyword, Pageable pageable);
}
