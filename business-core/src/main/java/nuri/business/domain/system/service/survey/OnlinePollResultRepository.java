package nuri.business.domain.system.service.survey;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

/**
 * 온라인설문 결과 Repository
 */
public interface OnlinePollResultRepository extends JpaRepository<OnlinePollResult, String> {
    long countByPollArtclId(String pollArtclId);

    /** 항목별 투표수 배치 집계 — N+1(항목마다 countByPollArtclId) 제거용. 반환: [pollArtclId, count]. */
    @Query("SELECT r.pollArtclId, COUNT(r) FROM OnlinePollResult r WHERE r.pollArtclId IN :artclIds GROUP BY r.pollArtclId")
    List<Object[]> countByPollArtclIdIn(@Param("artclIds") java.util.Collection<String> artclIds);

    @Query("SELECT COUNT(r) FROM OnlinePollResult r WHERE r.pollId = :pollId AND r.frstRgtrId = :frstRgtrId")
    long countByPollIdAndFrstRegisterId(@Param("pollId") String pollId, @Param("frstRgtrId") String frstRegisterId);

    List<OnlinePollResult> findByPollId(String pollId);

    void deleteByPollId(String pollId);

    // [V2_13 결속] 항목 삭제 시 해당 항목 투표결과 선정리
    void deleteByPollArtclId(String pollArtclId);
}
