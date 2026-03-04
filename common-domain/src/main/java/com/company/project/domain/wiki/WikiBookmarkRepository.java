package com.company.project.domain.wiki;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * ?袁り텕 ?브낮彛??Repository
 */
public interface WikiBookmarkRepository extends JpaRepository<WikiBookmark, String> {
    Page<WikiBookmark> findByUserId(String userId, Pageable pageable);
    Page<WikiBookmark> findByUserIdAndWikiBkmkNmContaining(String userId, String wikiBkmkNm, Pageable pageable);
    Optional<WikiBookmark> findByUserIdAndWikiBkmkNm(String userId, String wikiBkmkNm);
}