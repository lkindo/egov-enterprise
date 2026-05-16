package nuri.business.domain.note;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

/**
 * 수신쪽지 Repository
 */
@Repository("noteRecptnDomainRepository")
public interface NoteRecptnDomainRepository extends JpaRepository<NoteRecptn, String> {

    @Query("SELECT r FROM NoteRecptn r JOIN FETCH r.note n WHERE r.rcverId = :rcverId AND (:searchWrd IS NULL OR n.noteSj LIKE %:searchWrd% OR n.noteCn LIKE %:searchWrd%)")
    Page<NoteRecptn> searchNoteRecptns(@Param("searchCondition") String searchCondition, @Param("searchWrd") String searchWrd,
            @Param("rcverId") String rcverId, Pageable pageable);

    // legacy
    default Page<NoteRecptn> searchReceivedNotes(String rcverId, String searchWrd, Pageable pageable) {
        return searchNoteRecptns(null, searchWrd, rcverId, pageable);
    }

    @Query("SELECT r FROM NoteRecptn r JOIN FETCH r.note n WHERE r.rcverId = :rcverId")
    Page<NoteRecptn> findByRcverId(@Param("rcverId") String rcverId, Pageable pageable);

    Optional<NoteRecptn> findByNoteNoteIdAndRcverId(String noteId, String rcverId);
}
