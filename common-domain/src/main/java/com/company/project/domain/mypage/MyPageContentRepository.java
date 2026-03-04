package com.company.project.domain.mypage;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * 筌띾뜆???륁뵠筌왖 ?뚢뫂?쀯㎘?Repository
 */
public interface MyPageContentRepository extends JpaRepository<MyPageContent, String> {

    Page<MyPageContent> findByCntntsNmContaining(String cntntsNm, Pageable pageable);

    List<MyPageContent> findByCntntsUseAt(String cntntsUseAt);
}