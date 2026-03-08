package com.company.project.domain.note;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

/**
 * 獄쏆룇?筌잛럩? Repository
 */
@Repository("noteRecptnDomainRepository")
public interface NoteRecptnDomainRepository extends JpaRepository<NoteRecptn, String> {

    @Query("SELECT r FROM NoteRecptn r JOIN FETCH r.note n WHERE r.rcverId = :rcverId AND (n.noteSj LIKE %:searchWrd% OR n.noteCn LIKE %:searchWrd%)")
    Page<NoteRecptn> searchReceivedNotes(@Param("rcverId") String rcverId, @Param("searchWrd") String searchWrd,
            Pageable pageable);

    @Query("SELECT r FROM NoteRecptn r JOIN FETCH r.note n WHERE r.rcverId = :rcverId")
    Page<NoteRecptn> findByRcverId(@Param("rcverId") String rcverId, Pageable pageable);

    Optional<NoteRecptn> findByNoteNoteIdAndRcverId(String noteId, String rcverId);
}
