package nuri.business.domain.system.service.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SurveyArticleRepository extends JpaRepository<SurveyArticle, String> {
    List<SurveyArticle> findBySrvyQstnIdOrderByArtclSnAsc(String srvyQstnId);

    /** 여러 문항의 항목을 한 번에 조회 — 문항별 getItemList N+1 제거용. */
    List<SurveyArticle> findBySrvyQstnIdInOrderBySrvyQstnIdAscArtclSnAsc(java.util.Collection<String> srvyQstnIds);

    // [V2_13 결속] 설문/문항 삭제 시 항목 선정리용 파생 삭제
    void deleteBySrvyId(String srvyId);

    void deleteBySrvyQstnId(String srvyQstnId);
}
