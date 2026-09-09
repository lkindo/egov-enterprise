package nuri.business.domain.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface SurveyInfoRepository extends JpaRepository<SurveyInfo, Long> {
    /** 중복 검사부터 답변 전체 커밋까지 같은 설문의 제출을 직렬화한다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SurveyInfo s where s.srvySn = :srvySn")
    Optional<SurveyInfo> findByIdForSubmission(@Param("srvySn") Long srvySn);

    Optional<SurveyInfo> findBySrvySn(Long srvySn);
    Page<SurveyInfo> findBySrvyTtlContaining(String keyword, Pageable pageable);
}
