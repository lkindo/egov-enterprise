package com.company.project.domain.system.service.qna;

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
     * 筌욌뜄揆 ??뺛걠 野꺜??
     */
    Page<Qna> findByQestnSjContaining(String qestnSj, Pageable pageable);

    /**
     * 筌ｌ꼶??怨밴묶癰?野꺜??
     */
    Page<Qna> findByQnaProcessSttusCode(String qnaProcessSttusCode, Pageable pageable);

    /**
     * ??쇱뜖??野꺜??(筌욌뜄揆??뺛걠 ?癒?뮉 筌욌뜄揆??곸뒠)
     */
    @Query("SELECT q FROM Qna q WHERE q.qestnSj LIKE %:keyword% OR q.qestnCn LIKE %:keyword%")
    Page<Qna> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    default Page<Qna> searchQnas(String keyword, Pageable pageable) {
        return searchByKeyword(keyword == null ? "" : keyword, pageable);
    }

    /**
     * 沃섎챶?잒퉪? Q&A 筌뤴뫖以?
     */
    @Query("SELECT q FROM Qna q WHERE q.qnaProcessSttusCode = 'Q'")
    Page<Qna> findUnanswered(Pageable pageable);
}
