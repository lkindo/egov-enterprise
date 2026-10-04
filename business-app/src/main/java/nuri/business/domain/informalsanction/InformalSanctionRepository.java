package nuri.business.domain.informalsanction;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * 비정형 결재 Repository
 */
public interface InformalSanctionRepository extends JpaRepository<InformalSanction, Long> {
    /**
     * 목록 조회 조건(2026-09-26 DIP B5 F4) — 비어 있는 조건은 걸지 않는다. 검색어는 서비스가 소문자·LIKE 이스케이프를
     * 마친 패턴이고, 기간은 요청일(yyyyMMdd) 포함 범위다. 검색어는 제목과 문서 번호에서 찾는다 — 알림이 말하는
     * '결재(번호 N)' 으로 문서를 찾을 수 있어야 한다(2026-10-01).
     */
    String LIST_FILTER = " and (:keyword is null or lower(s.docTtl) like :keyword escape '!'"
            + " or cast(s.ifmlAtrzSn as string) like :keyword escape '!')"
            + " and (:fromYmd is null or s.reqYmd >= :fromYmd) and (:toYmd is null or s.reqYmd <= :toYmd)"
            + " and (:status is null or s.aprvYn = :status)";

    @Query("select s from InformalSanction s where s.aplcntId = :aplcntId" + LIST_FILTER)
    Page<InformalSanction> findSubmitted(@Param("aplcntId") String aplcntId,
            @Param("keyword") String keyword, @Param("fromYmd") String fromYmd, @Param("toYmd") String toYmd,
            @Param("status") String status, Pageable pageable);

    @Query("select s from InformalSanction s where exists (select d.id from InformalSanctionDetail d "
            + "where d.id.ifmlAtrzSn = s.ifmlAtrzSn and d.id.userId = :aprvrId)")
    Page<InformalSanction> findByAprvrId(@Param("aprvrId") String aprvrId, Pageable pageable);

    @Query("select s from InformalSanction s where s.aprvYn = 'A' and exists "
            + "(select d.id from InformalSanctionDetail d where d.id.ifmlAtrzSn = s.ifmlAtrzSn "
            + "and d.id.atrzCycl = s.atrzCycl and d.id.userId = :aprvrId and d.aprvYn = 'A')" + LIST_FILTER)
    Page<InformalSanction> findPending(@Param("aprvrId") String aprvrId,
            @Param("keyword") String keyword, @Param("fromYmd") String fromYmd, @Param("toYmd") String toYmd,
            @Param("status") String status, Pageable pageable);

    /** 문서의 현재 상태와 관계없이 본인이 결정한 차수의 라인이 있는 문서. */
    @Query("select s from InformalSanction s where exists (select d.id from InformalSanctionDetail d "
            + "where d.id.ifmlAtrzSn = s.ifmlAtrzSn and d.id.userId = :aprvrId and d.aprvYn in :aprvYns)" + LIST_FILTER)
    Page<InformalSanction> findProcessed(@Param("aprvrId") String aprvrId,
            @Param("aprvYns") java.util.Collection<String> aprvYns,
            @Param("keyword") String keyword, @Param("fromYmd") String fromYmd, @Param("toYmd") String toYmd,
            @Param("status") String status, Pageable pageable);

    /**
     * '참조된 결재'(2026-10-04 D4) — 내가 참조자로 지정된 문서. 참조는 추가만 하므로 문서의 상태·차수와 관계없이 남는다.
     * 대기함·처리함과 달리 결재선 표를 보지 않는다(참조자는 결재하지 않는다).
     */
    @Query("select s from InformalSanction s where exists (select r.id from InformalSanctionReference r "
            + "where r.id.ifmlAtrzSn = s.ifmlAtrzSn and r.id.userId = :userId)" + LIST_FILTER)
    Page<InformalSanction> findReferenced(@Param("userId") String userId,
            @Param("keyword") String keyword, @Param("fromYmd") String fromYmd, @Param("toYmd") String toYmd,
            @Param("status") String status, Pageable pageable);

    /**
     * 상세 열람의 관문 — 신청자, 어느 차수든 결재선에 든 사람, 참조자(2026-10-04 D4)만 문서를 찾는다. 참조자는 차수·상태 조건 없이
     * 통과한다(한 번 지정되면 그 문서를 계속 읽는다). 그 밖의 사람에게는 문서가 없는 것과 같다(404, 존재를 드러내지 않는다).
     */
    @Query("SELECT s FROM InformalSanction s WHERE s.ifmlAtrzSn = :id "
            + "AND (s.aplcntId = :participantId OR EXISTS (SELECT d.id FROM InformalSanctionDetail d "
            + "WHERE d.id.ifmlAtrzSn = s.ifmlAtrzSn AND d.id.userId = :participantId) "
            + "OR EXISTS (SELECT r.id FROM InformalSanctionReference r "
            + "WHERE r.id.ifmlAtrzSn = s.ifmlAtrzSn AND r.id.userId = :participantId))")
    Optional<InformalSanction> findByIdAndParticipant(
            @Param("id") Long id,
            @Param("participantId") String participantId);

    /** 결재선 제안의 원천 — 내가 올린 최근 문서(2026-10-03). 수가 적어 페이지 대신 상한으로 자른다. */
    List<InformalSanction> findTop40ByAplcntIdOrderByIfmlAtrzSnDesc(String aplcntId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from InformalSanction s where s.ifmlAtrzSn = :id")
    Optional<InformalSanction> findByIdForUpdate(@Param("id") Long id);

    @Query("select count(s) from InformalSanction s where s.aprvYn = 'A' and exists "
            + "(select d.id from InformalSanctionDetail d where d.id.ifmlAtrzSn = s.ifmlAtrzSn "
            + "and d.id.atrzCycl = s.atrzCycl and d.id.userId = :aprvrId and d.aprvYn = 'A')")
    long countPending(@Param("aprvrId") String aprvrId);
}
