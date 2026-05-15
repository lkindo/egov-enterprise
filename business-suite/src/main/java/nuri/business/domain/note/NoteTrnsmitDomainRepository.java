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

    @Query("SELECT t FROM NoteTrnsmit t JOIN FETCH t.note n WHERE t.dsptchUserId = :dsptchUserId AND (:searchWrd IS NULL OR n.noteSj LIKE %:searchWrd% OR n.noteCn LIKE %:searchWrd%) AND t.deleteAt = 'N'")
    Page<NoteTrnsmit> searchNoteTrnsmits(@Param("searchCondition") String searchCondition, @Param("searchWrd") String searchWrd,
            @Param("dsptchUserId") String dsptchUserId, Pageable pageable);

    @Query("SELECT t FROM NoteTrnsmit t JOIN FETCH t.note n WHERE t.dsptchUserId = :dsptchUserId AND t.deleteAt = 'N'")
    Page<NoteTrnsmit> findByDsptchUserId(@Param("dsptchUserId") String dsptchUserId, Pageable pageable);
}
