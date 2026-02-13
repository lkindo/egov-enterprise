package com.company.project.domain.note;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * 보낸쪽지 Repository
 */
@Repository("noteTrnsmitDomainRepository")
public interface NoteTrnsmitDomainRepository extends JpaRepository<NoteTrnsmit, String> {

    @Query("SELECT t FROM NoteTrnsmit t JOIN FETCH t.note n WHERE t.trnsmiterId = :trnsmiterId AND (n.noteSj LIKE %:searchWrd% OR n.noteCn LIKE %:searchWrd%) AND t.deleteAt = 'N'")
    Page<NoteTrnsmit> searchSentNotes(@Param("trnsmiterId") String trnsmiterId, @Param("searchWrd") String searchWrd,
            Pageable pageable);

    @Query("SELECT t FROM NoteTrnsmit t JOIN FETCH t.note n WHERE t.trnsmiterId = :trnsmiterId AND t.deleteAt = 'N'")
    Page<NoteTrnsmit> findByTrnsmiterId(@Param("trnsmiterId") String trnsmiterId, Pageable pageable);

    Page<NoteTrnsmit> findByTrnsmiterIdAndDeleteAt(String trnsmiterId, String deleteAt, Pageable pageable);
}
