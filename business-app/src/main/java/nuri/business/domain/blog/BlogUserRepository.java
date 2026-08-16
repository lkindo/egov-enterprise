package nuri.business.domain.blog;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BlogUserRepository extends JpaRepository<BlogUser, BlogUserId> {

    // [V2_13 결속] 사용자 삭제 시 블로그 멤버십 정리 (fk_tb_blog_user_map_tb_user_info NO ACTION)
    @Modifying(clearAutomatically = true)
    @Query("DELETE FROM BlogUser b WHERE b.userId IN :userIds")
    int deleteByUserIdIn(@Param("userIds") List<String> userIds);
}
