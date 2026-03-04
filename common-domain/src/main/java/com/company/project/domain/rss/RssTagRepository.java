package com.company.project.domain.rss;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * RSS ??볥젃 ?類ｋ궖 Repository
 */
@org.springframework.stereotype.Repository("rssRssTagRepository")
public interface RssTagRepository extends JpaRepository<RssTag, String> {
    Page<RssTag> findByTrgetSvcNmContaining(String trgetSvcNm, Pageable pageable);
}