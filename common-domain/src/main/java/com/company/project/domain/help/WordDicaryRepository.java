package com.company.project.domain.help;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 용어사전 Repository
 */
public interface WordDicaryRepository extends JpaRepository<WordDicary, String> {
    Page<WordDicary> findByWordNmContaining(String wordNm, Pageable pageable);
}
