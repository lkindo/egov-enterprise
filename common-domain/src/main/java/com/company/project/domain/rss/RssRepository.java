package com.company.project.domain.rss;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * RSS 정보 Repository
 */
public interface RssRepository extends JpaRepository<Rss, String> {
}
