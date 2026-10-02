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
    /** 제출·편집·취소가 같은 설문 행을 먼저 잠그고, 검사부터 전체 변경 커밋까지 직렬화한다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SurveyInfo s where s.srvySn = :srvySn")
    Optional<SurveyInfo> findByIdForSubmission(@Param("srvySn") Long srvySn);

    /** 잠금 전에 문항 Entity를 로드하지 않고, 변경되지 않는 부모 식별자만 찾는다. */
    @Query("select q.srvySn from SurveyQuestion q where q.srvyQstnSn = :srvyQstnSn")
    Optional<Long> findSurveyIdByQuestionId(@Param("srvyQstnSn") Long srvyQstnSn);

    /** 잠금 대기 전의 선택지 Entity가 영속성 컨텍스트에 남지 않도록 부모 식별자만 찾는다. */
    @Query("select a.srvySn from SurveyArticle a where a.srvyArtclSn = :srvyArtclSn")
    Optional<Long> findSurveyIdByArticleId(@Param("srvyArtclSn") Long srvyArtclSn);

    Optional<SurveyInfo> findBySrvySn(Long srvySn);
    Page<SurveyInfo> findBySrvyTtlContaining(String keyword, Pageable pageable);

    /** [2026-10-01 결정 21] 응답자 목록 — 공개된 설문만. */
    Page<SurveyInfo> findByRlsYn(String rlsYn, Pageable pageable);

    Page<SurveyInfo> findByRlsYnAndSrvyTtlContaining(String rlsYn, String keyword, Pageable pageable);

    /** 이 템플릿으로 만든 설문 수 — 템플릿 삭제 전에 쓰임을 확인한다. */
    long countBySrvyTmpltSn(Long srvyTmpltSn);
}
