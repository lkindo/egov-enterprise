package nuri.business.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
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

    /**
     * 제시된 토큰이 아직 저장된 값일 때만 회전한다 — 재발급 경합의 원자적 교체. [2026-09-16]
     *
     * <p>종전에는 읽어 온 엔티티를 그대로 덮어썼다(dirty checking). 같은 리프레시 토큰으로 <b>동시에</b>
     * 재발급하면 두 트랜잭션이 같은 행을 읽고 각자 회전해 <b>둘 다 성공</b>하고 마지막 저장만 남는다 —
     * 진 쪽 클라이언트는 서버가 <b>이미 무효화한 토큰</b>을 들고 있다가 다음 재발급에서 이유 없이
     * 로그아웃된다. 프런트의 단일 실행 계약(frontend/src/lib/api/__tests__/reissue-single-flight.test.ts)은
     * 이미 "같은 토큰의 두 번째 재발급은 401" 을 백엔드 계약으로 적어 두고 있었고, 이 메서드가 그것을
     * 실제로 집행한다.
     *
     * <p>⚠ {@code rotated} 와 같은 값이 이미 저장돼 있으면 성공으로 본다. JWT 의 {@code iat} 는 초 단위라
     * <b>같은 초에 일어난 두 회전은 같은 문자열</b>을 만든다 — 그때까지 거부하면 아무 잘못 없는 두 번째 탭이
     * 즉시 로그인 화면으로 튕긴다(클라이언트가 재발급 실패를 세션 만료로 처리한다). 그 경우 돌려주는 토큰은
     * 실제로 저장돼 있는 바로 그 값이므로 무효한 자격을 발급하는 것이 아니다.
     *
     * @return 갱신된 행 수. 0 이면 그 사이 다른 재발급이 회전을 마쳤다는 뜻이다.
     */
    @Modifying(flushAutomatically = true)
    @Query("""
            UPDATE RefreshToken token
               SET token.rfshTkn = :rotated, token.mdfcnDt = :rotatedAt
             WHERE token.userId = :userId
               AND (token.rfshTkn = :presented OR token.rfshTkn = :rotated)
            """)
    int rotateIfCurrent(@Param("userId") String userId,
                        @Param("presented") String presented,
                        @Param("rotated") String rotated,
                        @Param("rotatedAt") LocalDateTime rotatedAt);

    /**
     * 만료된 토큰 행을 지운다 — <b>호출한 트랜잭션과 독립적으로</b> 커밋한다. [2026-09-16]
     *
     * <p>재발급은 만료를 확인하면 행을 지운 뒤 {@code BusinessException} 을 던지는데, 그것이
     * {@code RuntimeException} 이라 바깥 트랜잭션이 롤백되면서 <b>삭제도 함께 취소</b>됐다 —
     * 정리한다고 적혀 있을 뿐 실제로는 지워진 적이 없다. 별도 트랜잭션으로 분리해 실제로 지운다.
     *
     * <p>0 행은 실패가 아니다. 같은 만료 토큰으로 동시에 두 번 재발급하면 한쪽이 먼저 지운다 —
     * 엔티티 {@code delete} 로는 그때 Hibernate 가 행 수 불일치로 죽어 401 이어야 할 응답이 500 이 된다.
     */
    @Modifying
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @Query("DELETE FROM RefreshToken token WHERE token.userId = :userId AND token.rfshTkn = :presented")
    int deleteIfCurrent(@Param("userId") String userId, @Param("presented") String presented);
}
