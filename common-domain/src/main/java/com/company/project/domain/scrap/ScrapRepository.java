package com.company.project.domain.scrap;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 스크랩 Repository
 */
public interface ScrapRepository extends JpaRepository<Scrap, String> {

    Page<Scrap> findByUniqId(String uniqId, Pageable pageable);

    Page<Scrap> findByBbsId(String bbsId, Pageable pageable);

    Page<Scrap> findByUniqIdAndUseAt(String uniqId, String useAt, Pageable pageable);
}
