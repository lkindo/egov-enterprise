package com.company.project.domain.news;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.stereotype.Repository;

/**
 * ??곷뮞?類ｋ궖 Repository
 */
@Repository("newsDomainRepository")
public interface NewsDomainRepository extends JpaRepository<News, String> {
    Page<News> findByNewsSjContaining(String newsSj, Pageable pageable);
}
