package nuri.business.domain.system.content.community;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

public interface CommunityUserRepository
        extends JpaRepository<CommunityUser, CommunityUserId>, QuerydslPredicateExecutor<CommunityUser> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select cu from CommunityUser cu where cu.id = :id")
    Optional<CommunityUser> findByIdForUpdate(@Param("id") CommunityUserId id);

    List<CommunityUser> findByIdCmntySn(Long cmntySn);

    // [2026-09-06 DEC-OPS-043] 관리자 회원·가입 신청 목록. 정렬은 서비스가 Pageable 로 넘긴다.
    Page<CommunityUser> findByIdCmntySn(Long cmntySn, Pageable pageable);

    Page<CommunityUser> findByIdCmntySnAndMbrSttsCd(Long cmntySn, String mbrSttsCd, Pageable pageable);

    /** [2026-10-01 결정 20] 주어진 커뮤니티마다 한 상태의 회원 수 — 관리 목록 한 페이지를 한 번의 조회로 채운다. */
    @Query("select cu.id.cmntySn as cmntySn, count(cu) as cnt from CommunityUser cu"
            + " where cu.mbrSttsCd = :status and cu.id.cmntySn in :cmntySns group by cu.id.cmntySn")
    List<StatusCount> countByStatusForCommunities(@Param("status") String status,
            @Param("cmntySns") java.util.Collection<Long> cmntySns);

    interface StatusCount {
        Long getCmntySn();

        long getCnt();
    }

    // [V2_13 결속] 사용자 삭제 시 커뮤니티 멤버십 정리 (fk_tb_cmnty_user_map_tb_user_info NO ACTION)
    void deleteByIdUserIdIn(List<String> userIds);
}
