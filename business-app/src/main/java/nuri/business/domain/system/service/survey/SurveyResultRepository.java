package nuri.business.domain.system.service.survey;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SurveyResultRepository extends JpaRepository<SurveyResult, Long> {
    long countBySrvyArtclSn(Long srvyArtclSn);

    // [V2_13 결속] 설문/문항/항목 삭제 시 응답 선정리용 파생 삭제
    void deleteBySrvySn(Long srvySn);

    void deleteBySrvyQstnSn(Long srvyQstnSn);

    void deleteBySrvyArtclSn(Long srvyArtclSn);

    /** 응답자명 부분일치(선택). 관리 목록은 설문 경계를 넘어 조회한다 — 응답 내용에는 신상이 없다. */
    @Query("SELECT r FROM SurveyResult r WHERE :keyword = '' OR r.rspnsNm LIKE %:keyword%")
    Page<SurveyResult> searchByRspnsNm(@Param("keyword") String keyword, Pageable pageable);

    /**
     * 항목별 응답 수 집계.
     *
     * <p>항목마다 개별 집계 메서드를 부르면 항목 수만큼 쿼리가 나간다(N+1).
     * 설문 하나를 한 번의 group by 로 집계한다.
     */
    @Query("""
            SELECT r.srvyArtclSn AS srvyArtclSn, COUNT(r) AS cnt
            FROM SurveyResult r
            WHERE r.srvySn = :srvySn
            GROUP BY r.srvyArtclSn
            """)
    List<ArticleCount> countGroupedByArticle(@Param("srvySn") Long srvySn);

    /** {@link #countGroupedByArticle} 전용 투영. */
    interface ArticleCount {
        Long getSrvyArtclSn();

        long getCnt();
    }

    /**
     * 같은 사용자가 같은 설문에 이미 응답했는지.
     *
     * <p>{@code frstRgtrId} 는 {@code BaseEntity} 의 {@code @CreatedBy} 감사 컬럼이다.
     * 이 테이블에는 응답자 사용자 ID 컬럼이 따로 없어, 제출자 식별자는 사실상 이 감사 컬럼뿐이다.
     */
    boolean existsBySrvySnAndFrstRgtrId(Long srvySn, String frstRgtrId);
}
