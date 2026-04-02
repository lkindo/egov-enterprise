package com.company.project.business.domain.faq;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * FAQ Repository
 */
public interface FaqRepository extends JpaRepository<Faq, String> {

    /**
     * 筌욌뜄揆 ??뺛걠 野꺜
     */
    Page<Faq> findByQestnSjContaining(String qestnSj, Pageable pageable);

    /**
     * ??쇱뜖野꺜(筌욌뜄揆뺛걠 癒뮉 筌욌뜄揆곸뒠)
     */
    @Query("SELECT f FROM Faq f WHERE f.qestnSj LIKE %:keyword% OR f.qestnCn LIKE %:keyword%")
    Page<Faq> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    default Page<Faq> searchFaqs(String keyword, Pageable pageable) {
        return searchByKeyword(keyword == null ? "" : keyword, pageable);
    }
}
