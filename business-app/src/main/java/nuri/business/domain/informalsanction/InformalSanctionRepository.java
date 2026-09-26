package nuri.business.domain.informalsanction;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * 비정형 결재 Repository
 */
public interface InformalSanctionRepository extends JpaRepository<InformalSanction, Long> {
    /**
     * 목록 조회 조건(2026-09-26 DIP B5 F4) — 비어 있는 조건은 걸지 않는다. 검색어는 서비스가 소문자·LIKE 이스케이프를
     * 마친 패턴이고, 기간은 요청일(yyyyMMdd) 포함 범위다.
     */
    String LIST_FILTER = " and (:keyword is null or lower(s.docTtl) like :keyword escape '!')"
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

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from InformalSanction s where s.ifmlAtrzSn = :id")
    Optional<InformalSanction> findByIdForUpdate(@Param("id") Long id);

    @Query("select count(s) from InformalSanction s where s.aprvYn = 'A' and exists "
            + "(select d.id from InformalSanctionDetail d where d.id.ifmlAtrzSn = s.ifmlAtrzSn "
            + "and d.id.atrzCycl = s.atrzCycl and d.id.userId = :aprvrId and d.aprvYn = 'A')")
    long countPending(@Param("aprvrId") String aprvrId);
}
