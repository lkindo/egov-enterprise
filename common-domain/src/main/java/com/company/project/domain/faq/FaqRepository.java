package com.company.project.domain.faq;

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
     * 질문 제목 검색
     */
    Page<Faq> findByQestnSjContaining(String qestnSj, Pageable pageable);

    /**
     * 키워드 검색 (질문제목 또는 질문내용)
     */
    @Query("SELECT f FROM Faq f WHERE f.qestnSj LIKE %:keyword% OR f.qestnCn LIKE %:keyword%")
    Page<Faq> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);
}
