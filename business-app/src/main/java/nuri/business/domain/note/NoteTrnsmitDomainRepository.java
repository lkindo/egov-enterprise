package nuri.business.domain.note;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

/**
 * 발신쪽지 Repository
 */
@Repository("noteTrnsmitDomainRepository")
public interface NoteTrnsmitDomainRepository extends JpaRepository<NoteTrnsmit, Long> {

    // ── [V2_21 물리 수거 GC 지원] ──
    /** 물리 수거 판정 직렬화용 비관적 쓰기잠금 조회. 양측 삭제 판정~수거를 한 트랜잭션에서 원자화한다(레이스 차단). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT t FROM NoteTrnsmit t WHERE t.noteSndngSn = :noteSndngSn")
    Optional<NoteTrnsmit> findByIdForUpdate(@Param("noteSndngSn") Long noteSndngSn);

    /** 특정 쪽지(note)를 참조하는 발신 건 수(info 물리삭제 안전성 판정용). */
    long countByNoteNoteSn(Long noteSn);

    // [2026-09-02] ORDER BY 를 명시한다(수신함과 같은 이유 — 종전엔 DB 임의 순서였다).
    @Query(value = "SELECT t FROM NoteTrnsmit t JOIN FETCH t.note n WHERE t.sndrId = :dsptchUserId AND (:searchWrd IS NULL OR n.noteTtl LIKE %:searchWrd% OR n.noteCn LIKE %:searchWrd%) AND t.delYn = 'N' ORDER BY t.noteSndngSn DESC",
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
