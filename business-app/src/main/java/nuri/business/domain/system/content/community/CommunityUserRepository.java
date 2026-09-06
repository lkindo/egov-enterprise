package nuri.business.domain.system.content.community;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;
import java.util.List;

public interface CommunityUserRepository
        extends JpaRepository<CommunityUser, CommunityUserId>, QuerydslPredicateExecutor<CommunityUser> {
    List<CommunityUser> findByIdCmntySn(Long cmntySn);

    // [2026-09-06 DEC-OPS-043] 관리자 회원·가입 신청 목록. 정렬은 서비스가 Pageable 로 넘긴다.
    Page<CommunityUser> findByIdCmntySn(Long cmntySn, Pageable pageable);

    Page<CommunityUser> findByIdCmntySnAndMbrSttsCd(Long cmntySn, String mbrSttsCd, Pageable pageable);

    // [V2_13 결속] 사용자 삭제 시 커뮤니티 멤버십 정리 (fk_tb_cmnty_user_map_tb_user_info NO ACTION)
    void deleteByIdUserIdIn(List<String> userIds);
}
