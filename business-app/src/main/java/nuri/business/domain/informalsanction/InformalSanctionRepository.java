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

    @Query("SELECT s FROM InformalSanction s WHERE s.ifmlAtrzSn = :id "
            + "AND (s.aplcntId = :participantId OR EXISTS (SELECT d.id FROM InformalSanctionDetail d "
            + "WHERE d.id.ifmlAtrzSn = s.ifmlAtrzSn AND d.id.userId = :participantId))")
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
