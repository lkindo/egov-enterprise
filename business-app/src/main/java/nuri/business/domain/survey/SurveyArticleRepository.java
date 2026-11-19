package nuri.business.domain.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SurveyArticleRepository extends JpaRepository<SurveyArticle, Long> {
    /**
     * 문항의 선택지를 순번 순으로 — 순번이 같거나 비면 등록 순(PK)으로 가른다(2026-11-19). 화면이 순번을 보내지 않아 NULL 로 저장된
     * 선택지는 순번만으로는 DB 가 순서를 보장하지 않았다. 손으로 쓴 질의 대신 파생 질의로 둔다 — 질의 애노테이션이 붙은 저장소는
     * 벤더 증거 입력이 된다(scripts/vendor-evidence-inputs.mjs).
     */
    List<SurveyArticle> findBySrvyQstnSnOrderByArtclSnAscSrvyArtclSnAsc(Long srvyQstnSn);

    /** 여러 문항의 항목을 한 번에 조회 — 문항별 getItemList N+1 제거용. 순서 규칙은 위와 같다. */
    List<SurveyArticle> findBySrvyQstnSnInOrderBySrvyQstnSnAscArtclSnAscSrvyArtclSnAsc(java.util.Collection<Long> srvyQstnSns);

    // [V2_13 결속] 설문/문항 삭제 시 항목 선정리용 파생 삭제
    void deleteBySrvySn(Long srvySn);

    void deleteBySrvyQstnSn(Long srvyQstnSn);
}
