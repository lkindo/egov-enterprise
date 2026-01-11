package com.company.project.domain.wiki;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("wikiBookmarkDomainRepository")
public interface WikiBookmarkRepository extends JpaRepository<WikiBookmark, String> {
}
