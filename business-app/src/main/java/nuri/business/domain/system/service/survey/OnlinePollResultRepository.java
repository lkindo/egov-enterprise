package nuri.business.domain.system.service.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

/**
 * 온라인설문 결과 Repository
 */
public interface OnlinePollResultRepository extends JpaRepository<OnlinePollResult, Long> {
    long countByPollArtclSn(Long pollArtclSn);

    /** 항목별 투표수 배치 집계 — N+1 제거용. 반환: [pollArtclSn, count]. */
    @Query("SELECT r.pollArtclSn, COUNT(r) FROM OnlinePollResult r WHERE r.pollArtclSn IN :artclSns GROUP BY r.pollArtclSn")
    List<Object[]> countByPollArtclSnIn(@Param("artclSns") java.util.Collection<Long> artclSns);

    @Query("SELECT COUNT(r) FROM OnlinePollResult r WHERE r.pollSn = :pollSn AND r.frstRgtrId = :frstRgtrId")
    long countByPollSnAndFrstRegisterId(@Param("pollSn") Long pollSn, @Param("frstRgtrId") String frstRegisterId);

    List<OnlinePollResult> findByPollSn(Long pollSn);

    void deleteByPollSn(Long pollSn);

    // [V2_13 결속] 항목 삭제 시 해당 항목 투표결과 선정리
    void deleteByPollArtclSn(Long pollArtclSn);
}
