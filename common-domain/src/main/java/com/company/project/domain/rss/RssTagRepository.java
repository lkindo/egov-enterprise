package com.company.project.domain.rss;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * RSS 태그 정보 Repository
 */
public interface RssTagRepository extends JpaRepository<RssTag, String> {
    Page<RssTag> findByTrgetSvcNmContaining(String trgetSvcNm, Pageable pageable);
}
