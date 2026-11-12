package nuri.business.domain.user.repository;

import nuri.business.domain.user.entity.UserAbsence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserAbsenceRepository extends JpaRepository<UserAbsence, String> {

    /**
     * 이 날(yyyyMMdd) 나에게 결재를 맡긴 사람(esntlId) — 부재 중이고 기간 안이며 대리결재자가 나인 행이다(V2_151).
     * 날짜는 같은 형식의 문자열이라 사전순 비교가 날짜 비교와 같다.
     */
    @Query("select a.userId from UserAbsence a where a.userAbsnYn = 'Y' and a.sbtAprvrId = :delegate"
            + " and a.absnBgngYmd <= :ymd and a.absnEndYmd >= :ymd")
    List<String> findDelegatorsOn(@Param("delegate") String delegate, @Param("ymd") String ymd);

    /**
     * 기간이 겹치는 대리결재 — 이 사람에게 결재를 맡긴 부재 행 중 [from, to] 와 하루라도 겹치는 것(연쇄·순환 판정용).
     * {@code excludedUserId} 의 행은 뺀다(고치는 중인 자기 행).
     */
    @Query("select a from UserAbsence a where a.userAbsnYn = 'Y' and a.sbtAprvrId = :delegate"
            + " and a.userId <> :excludedUserId and a.absnBgngYmd <= :toYmd and a.absnEndYmd >= :fromYmd")
    List<UserAbsence> findOverlappingDelegationsTo(@Param("delegate") String delegate,
            @Param("excludedUserId") String excludedUserId, @Param("fromYmd") String fromYmd, @Param("toYmd") String toYmd);
}
