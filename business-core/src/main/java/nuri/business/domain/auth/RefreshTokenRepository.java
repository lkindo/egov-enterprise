package nuri.business.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

/**
 * Refresh Token JPA Repository
 */
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {
    Optional<RefreshToken> findByRfshTkn(String rfshTkn);
    void deleteByUserId(String userId);

    /**
     * 사용자 삭제 시 PK 축인 esntlId 목록의 리프레시 토큰을 한 번의 bulk delete로 정리한다.
     * 엔티티 필드명 {@code userId}는 레거시 명칭이지만 실제 저장 키는 esntlId다.
     */
    @Modifying
    @Query("DELETE FROM RefreshToken token WHERE token.userId IN :esntlIds")
    int deleteAllByEsntlIdIn(@Param("esntlIds") List<String> esntlIds);
}
