package com.company.project.domain.news;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 뉴스정보 Repository
 */
public interface NewsRepository extends JpaRepository<News, String> {
    Page<News> findByNewsSjContaining(String newsSj, Pageable pageable);
}
