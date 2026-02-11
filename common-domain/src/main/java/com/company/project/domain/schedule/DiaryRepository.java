package com.company.project.domain.schedule;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface DiaryRepository extends JpaRepository<Diary, String> {

    @Query("""
            SELECT d FROM Diary d
            WHERE (:searchCondition = 'SCHDUL_ID' AND d.schdulId = :searchKeyword)
               OR (:searchCondition = 'DIARY_NM' AND d.diaryNm LIKE '%' || :searchKeyword || '%')
               OR (:searchCondition = 'DRCT_MATTER' AND d.drctMatter LIKE '%' || :searchKeyword || '%')
               OR (:searchCondition = 'PARTCLR_MATTER' AND d.partclrMatter LIKE '%' || :searchKeyword || '%')
               OR (:searchKeyword IS NULL OR :searchKeyword = '')
            """)
    Page<Diary> searchDiaries(@Param("searchCondition") String searchCondition,
            @Param("searchKeyword") String searchKeyword,
            Pageable pageable);
}
