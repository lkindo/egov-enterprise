package nuri.business.domain.system.content.community;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;
import java.util.List;

public interface CommunityUserRepository
        extends JpaRepository<CommunityUser, CommunityUserId>, QuerydslPredicateExecutor<CommunityUser> {
    List<CommunityUser> findByIdCmntyId(String cmntyId);

    // [V2_13 결속] 사용자 삭제 시 커뮤니티 멤버십 정리 (fk_tb_cmnty_user_map_tb_user_info NO ACTION)
    void deleteByIdUserIdIn(List<String> userIds);
}
