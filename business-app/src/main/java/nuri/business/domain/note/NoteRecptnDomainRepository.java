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

    // [N+1 방지] convertToDto 가 noteDsptch.getSndrId()(비-@Id) 에 접근하므로 to-one 지연연관을 함께 fetch.
    // note·noteDsptch 모두 @ManyToOne(to-one)이라 다중 join fetch + 페이지네이션 안전(HHH000104 무관). 레거시 null 대비 LEFT.
    // [V2_21] 수신자 논리삭제된 사본(del_yn='Y')은 수신함에서 제외.
    @Query(value = "SELECT r FROM NoteRecptn r JOIN FETCH r.note n LEFT JOIN FETCH r.noteDsptch d WHERE r.rcvrId = :rcverId AND r.delYn = 'N' AND (:searchWrd IS NULL OR n.noteTtl LIKE %:searchWrd% OR n.noteCn LIKE %:searchWrd%)",
           countQuery = "SELECT count(r) FROM NoteRecptn r WHERE r.rcvrId = :rcverId AND r.delYn = 'N' AND (:searchWrd IS NULL OR r.note.noteTtl LIKE %:searchWrd% OR r.note.noteCn LIKE %:searchWrd%)")
    Page<NoteRecptn> searchNoteRecptns(@Param("searchCondition") String searchCondition, @Param("searchWrd") String searchWrd,
            @Param("rcverId") String rcverId, Pageable pageable);

    // ── [V2_21 물리 수거 GC 지원] ──
    /** 특정 발신 건에 딸린 수신 사본 중 지정 삭제상태(del_yn) 개수. 양측 삭제 판정용. */
    long countByNoteDsptchNoteSndngIdAndDelYn(String noteSndngId, String delYn);

    /** 특정 발신 건에 딸린 전체 수신 사본(수거 시 일괄 삭제 대상). */
    java.util.List<NoteRecptn> findByNoteDsptchNoteSndngId(String noteSndngId);

    /** 특정 쪽지(note)를 참조하는 수신 사본 수(info 물리삭제 안전성 판정용). */
    long countByNoteNoteId(String noteId);

    // legacy
    default Page<NoteRecptn> searchReceivedNotes(String rcverId, String searchWrd, Pageable pageable) {
        return searchNoteRecptns(null, searchWrd, rcverId, pageable);
    }

    @Query(value = "SELECT r FROM NoteRecptn r JOIN FETCH r.note n WHERE r.rcvrId = :rcvrId",
           countQuery = "SELECT count(r) FROM NoteRecptn r WHERE r.rcvrId = :rcvrId")
    Page<NoteRecptn> findByRcvrId(@Param("rcvrId") String rcvrId, Pageable pageable);

    @Deprecated
    default Page<NoteRecptn> findByRcverId(String rcverId, Pageable pageable) {
        return findByRcvrId(rcverId, pageable);
    }

    Optional<NoteRecptn> findByNoteNoteIdAndRcvrId(String noteId, String rcvrId);

    @Deprecated
    default Optional<NoteRecptn> findByNoteNoteIdAndRcverId(String noteId, String rcverId) {
        return findByNoteNoteIdAndRcvrId(noteId, rcverId);
    }
}
