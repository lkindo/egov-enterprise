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
    Page<InformalSanction> findByAplcntId(String aplcntId, Pageable pageable);

    @Query("select s from InformalSanction s where exists (select d.id from InformalSanctionDetail d "
            + "where d.id.ifmlAtrzSn = s.ifmlAtrzSn and d.id.userId = :aprvrId)")
    Page<InformalSanction> findByAprvrId(@Param("aprvrId") String aprvrId, Pageable pageable);

    @Query("select s from InformalSanction s where s.aprvYn = :aprvYn and exists "
            + "(select d.id from InformalSanctionDetail d where d.id.ifmlAtrzSn = s.ifmlAtrzSn "
            + "and d.id.atrzCycl = s.atrzCycl and d.id.userId = :aprvrId and d.aprvYn = 'A')")
    Page<InformalSanction> findByAprvrIdAndAprvYn(@Param("aprvrId") String aprvrId,
                                                @Param("aprvYn") String aprvYn, Pageable pageable);

    /** 문서의 현재 상태와 관계없이 본인이 결정한 차수의 라인이 있는 문서. */
    @Query("select s from InformalSanction s where exists (select d.id from InformalSanctionDetail d "
            + "where d.id.ifmlAtrzSn = s.ifmlAtrzSn and d.id.userId = :aprvrId and d.aprvYn in :aprvYns)")
    Page<InformalSanction> findByAprvrIdAndAprvYnIn(@Param("aprvrId") String aprvrId,
            @Param("aprvYns") java.util.Collection<String> aprvYns, Pageable pageable);

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
