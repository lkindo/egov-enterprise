package com.company.project.domain.wiki;

import org.springframework.data.jpa.repository.JpaRepository;

public interface WikiBookmarkRepository extends JpaRepository<WikiBookmark, String> {
}
