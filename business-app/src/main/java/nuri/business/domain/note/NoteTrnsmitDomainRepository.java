package nuri.business.domain.note;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * 발신쪽지 Repository
 */
@Repository("noteTrnsmitDomainRepository")
public interface NoteTrnsmitDomainRepository extends JpaRepository<NoteTrnsmit, String> {

    @Query(value = "SELECT t FROM NoteTrnsmit t JOIN FETCH t.note n WHERE t.sndrId = :dsptchUserId AND (:searchWrd IS NULL OR n.noteTtl LIKE %:searchWrd% OR n.noteCn LIKE %:searchWrd%) AND t.delYn = 'N'",
           countQuery = "SELECT count(t) FROM NoteTrnsmit t WHERE t.sndrId = :dsptchUserId AND (:searchWrd IS NULL OR t.note.noteTtl LIKE %:searchWrd% OR t.note.noteCn LIKE %:searchWrd%) AND t.delYn = 'N'")
    Page<NoteTrnsmit> searchNoteTrnsmits(@Param("searchCondition") String searchCondition, @Param("searchWrd") String searchWrd,
            @Param("dsptchUserId") String dsptchUserId, Pageable pageable);

    // legacy
    default Page<NoteTrnsmit> searchSentNotes(String dsptchUserId, String searchWrd, Pageable pageable) {
        return searchNoteTrnsmits(null, searchWrd, dsptchUserId, pageable);
    }

    @Query(value = "SELECT t FROM NoteTrnsmit t JOIN FETCH t.note n WHERE t.sndrId = :sndrId AND t.delYn = 'N'",
           countQuery = "SELECT count(t) FROM NoteTrnsmit t WHERE t.sndrId = :sndrId AND t.delYn = 'N'")
    Page<NoteTrnsmit> findBySndrId(@Param("sndrId") String sndrId, Pageable pageable);

    @Deprecated
    default Page<NoteTrnsmit> findByDsptchUserId(String dsptchUserId, Pageable pageable) {
        return findBySndrId(dsptchUserId, pageable);
    }
    
    // legacy
    default Page<NoteTrnsmit> findByTrnsmiterId(String dsptchUserId, Pageable pageable) {
        return findBySndrId(dsptchUserId, pageable);
    }
}
