package nuri.business.domain.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SurveyArticleRepository extends JpaRepository<SurveyArticle, Long> {
    List<SurveyArticle> findBySrvyQstnSnOrderByArtclSnAsc(Long srvyQstnSn);

    /** 여러 문항의 항목을 한 번에 조회 — 문항별 getItemList N+1 제거용. */
    List<SurveyArticle> findBySrvyQstnSnInOrderBySrvyQstnSnAscArtclSnAsc(java.util.Collection<Long> srvyQstnSns);

    // [V2_13 결속] 설문/문항 삭제 시 항목 선정리용 파생 삭제
    void deleteBySrvySn(Long srvySn);

    void deleteBySrvyQstnSn(Long srvyQstnSn);
}
