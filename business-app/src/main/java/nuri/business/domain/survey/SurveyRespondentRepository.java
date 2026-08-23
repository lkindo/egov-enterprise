package nuri.business.domain.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 설문 응답자 정보 Repository
 */
public interface SurveyRespondentRepository extends JpaRepository<SurveyRespondent, SurveyRespondentId> {

    Page<SurveyRespondent> findBySrvySn(Long srvySn, Pageable pageable);

    Page<SurveyRespondent> findByRspdntNmContaining(String rspdntNm, Pageable pageable);

    @Query("SELECT s FROM SurveyRespondent s WHERE s.srvySn = :srvySn AND (s.rspdntNm LIKE %:keyword% OR s.gndrCd = :keyword)")
    Page<SurveyRespondent> searchBySrvySnAndKeyword(@Param("srvySn") Long srvySn,
            @Param("keyword") String keyword, Pageable pageable);

    java.util.Optional<SurveyRespondent> findBySrvySnAndSrvyRspdntId(Long srvySn, String srvyRspdntId);

    boolean existsBySrvySn(Long srvySn);

    void deleteBySrvySnAndSrvyRspdntId(Long srvySn, String srvyRspdntId);

    // [V2_13 결속] 설문 삭제 시 응답자 선정리 (fk_tb_srvy_rspdnt_tb_srvy_info NO ACTION)
    void deleteBySrvySn(Long srvySn);
}
