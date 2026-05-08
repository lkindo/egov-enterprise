package nuri.foundation.domain.system.service.qna;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Q&A Repository
 */
public interface QnaRepository extends JpaRepository<Qna, String> {

    /**
     * 질문 제목 검색
     */
    Page<Qna> findByQestnSjContaining(String qestnSj, Pageable pageable);

    /**
     * 처리상태별 검색
     */
    Page<Qna> findByQnaProcessSttusCode(String qnaProcessSttusCode, Pageable pageable);

    /**
     * 키워드 검색 (제목 또는 내용)
     */
    @Query("SELECT q FROM Qna q WHERE q.qestnSj LIKE %:keyword% OR q.qestnCn LIKE %:keyword%")
    Page<Qna> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    default Page<Qna> searchQnas(String keyword, Pageable pageable) {
        return searchByKeyword(keyword == null ? "" : keyword, pageable);
    }

    /**
     * 미처리 Q&A 목록 조회
     */
    @Query("SELECT q FROM Qna q WHERE q.qnaProcessSttusCode = 'Q'")
    Page<Qna> findUnanswered(Pageable pageable);
}
