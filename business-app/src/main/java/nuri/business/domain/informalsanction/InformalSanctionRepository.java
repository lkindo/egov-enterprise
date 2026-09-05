package nuri.business.domain.informalsanction;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * 비정형 결재 Repository
 */
public interface InformalSanctionRepository extends JpaRepository<InformalSanction, Long> {
    Page<InformalSanction> findByAplcntId(String aplcntId, Pageable pageable);

    Page<InformalSanction> findByAprvrId(String aprvrId, Pageable pageable);

    Page<InformalSanction> findByAprvrIdAndAprvYn(String aprvrId, String aprvYn, Pageable pageable);

    /** 결재자 기준, 상태가 주어진 집합 안에 있는 건 — 처리 완료(승인·반려) 목록에 쓴다. */
    Page<InformalSanction> findByAprvrIdAndAprvYnIn(String aprvrId, java.util.Collection<String> aprvYns, Pageable pageable);

    @Query("SELECT s FROM InformalSanction s WHERE s.ifmlAtrzSn = :id "
            + "AND (s.aplcntId = :participantId OR s.aprvrId = :participantId)")
    Optional<InformalSanction> findByIdAndParticipant(
            @Param("id") Long id,
            @Param("participantId") String participantId);
}
