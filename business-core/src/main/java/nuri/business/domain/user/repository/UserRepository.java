package nuri.business.domain.user.repository;

import nuri.business.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.jspecify.annotations.NonNull;
import java.util.List;
import java.util.Optional;

@Repository("userRepository")
public interface UserRepository extends JpaRepository<User, String>, UserRepositoryCustom {
    Optional<User> findByEsntlId(String esntlId);
    Optional<User> findByUserId(String userId);

    /** 로그인 잠금 값이 그 값인 계정 수 — 관리자 홈의 운영 신호가 'Y' 를 센다(사용자 목록의 로그인 잠금 조건과 같은 값). */
    long countByLckYn(String lckYn);

    /** 사용자 상태 변경과 신규 수신자 배정을 같은 사용자 행에서 직렬화한다. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.esntlId = :esntlId")
    Optional<User> findByEsntlIdForUpdate(@Param("esntlId") String esntlId);

    /** 로그인 ID로 기록된 과거 제출을 현재 사용자에 결속하는 동안 삭제/재생성을 막는다. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u FROM User u WHERE u.userId = :userId")
    Optional<User> findByUserIdForUpdate(@Param("userId") String userId);

    @NonNull
    Optional<User> findById(@NonNull @Param("esntlId") String esntlId);

    /** 해당 조직에 소속된 사용자 수. 부서 삭제 가드에서 사용한다. */
    long countByOgnzId(String ognzId);

    /**
     * loginId(user_id) 복수 조회. 화면의 벌크 작업은 loginId 를 넘기는데 findAllById 는 esntlId(PK) 기준이라
     * 그대로 쓰면 조용히 0건이 된다(정체성 축 함정). 벌크 경로는 이 메서드를 쓴다.
     */
    List<User> findByUserIdIn(java.util.Collection<String> userIds);

    /** 발송 채널의 수신자 연락처 해석용(UserContactService). esntlId 축 일괄 조회. */
    List<User> findByEsntlIdIn(java.util.Collection<String> esntlIds);

    /**
     * 기능 권한 하나를 그룹 배정으로 가진 사용 중(P) 사용자의 esntlId 를 식별자 순으로 {@code limit} 까지(2026-09-26 DIP B5 F1).
     * 알림 수신자를 고르는 용도다 — 인가 판정은 요청마다 AuthorizationSnapshotService 가 한다.
     * [2026-11-25 품질 평가] 보유자 전체를 읽지 않게 상한을 받는다 — 결재 권한처럼 거의 모든 직원이 가진 권한은 보유자가
     * 사용자 수만큼이다. 특정 사람이 권한을 가졌는지는 {@link #findActiveEsntlIdsHoldingPermissionAmong} 으로 본다.
     */
    @Query("""
            SELECT DISTINCT u.esntlId FROM User u, nuri.business.domain.auth.UserAuthority m,
                nuri.business.domain.auth.AuthorityGrant g
            WHERE m.scrtyDcsnTrgtId = u.esntlId AND g.authrtCd = m.authrtId
              AND g.authrtTypeCd = 'OPERATION' AND g.authrtGrntCd = :permission AND u.userSttsCd = 'P'
            ORDER BY u.esntlId
            """)
    List<String> findActiveEsntlIdsHoldingPermission(@org.springframework.data.repository.query.Param("permission") String permission,
            org.springframework.data.domain.Limit limit);

    /**
     * 후보 가운데 기능 권한을 그룹 배정으로 가진 사용 중(P) 사용자의 esntlId — 결재자·참조자 지정 검사용(2026-11-25 품질 평가).
     * 종전에는 보유자 전체를 읽어 후보와 대조했다. 후보는 호출자가 상한을 둔 작은 목록이어야 하고 비어 있으면 부르지 않는다.
     */
    @Query("""
            SELECT DISTINCT u.esntlId FROM User u, nuri.business.domain.auth.UserAuthority m,
                nuri.business.domain.auth.AuthorityGrant g
            WHERE m.scrtyDcsnTrgtId = u.esntlId AND g.authrtCd = m.authrtId
              AND g.authrtTypeCd = 'OPERATION' AND g.authrtGrntCd = :permission AND u.userSttsCd = 'P'
              AND u.esntlId IN :candidates
            ORDER BY u.esntlId
            """)
    List<String> findActiveEsntlIdsHoldingPermissionAmong(
            @org.springframework.data.repository.query.Param("permission") String permission,
            @org.springframework.data.repository.query.Param("candidates") java.util.Collection<String> candidates);

    // [V2_13 결속] 권한그룹 삭제 시 사용자 참조 해제 (fk_tb_user_info_tb_authrt_group_info NO ACTION)
    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    // [2026-11-25 V2_156] 분류 그룹은 프로필 칸이다 — 해제하면서 편집 버전도 올린다. 올리지 않으면 그 사이 열어 둔 수정 폼이
    //   옛 버전으로 통과해 해제된 값을 되살리거나 FK 충돌을 낸다(Codex 검토).
    @Query("UPDATE User u SET u.groupId = null, u.editVersion = u.editVersion + 1 WHERE u.groupId IN :groupIds")
    int clearGroupIdByGroupIdIn(@Param("groupIds") List<String> groupIds);

    /**
     * 로그아웃 시각을 원자적으로 기록한다(2026-10-18, V2_131). 이 시각 전에 발급된 access token 은 거부된다.
     *
     * <p>엔티티의 {@code lastLgtDt} 는 읽기 전용이라 이 UPDATE 만 쓴다. 감사 컬럼(수정자·수정일시)은 바꾸지 않는다 —
     * 로그아웃은 사용자 정보의 수정이 아니다. 시각은 호출자가 애플리케이션 시계로 넘긴다(JWT 발급 시각과 같은 시계).
     */
    @org.springframework.data.jpa.repository.Modifying
    @Query(value = "UPDATE tb_user_info SET last_lgt_dt = :loggedOutAt WHERE esntl_id = :esntlId", nativeQuery = true)
    int recordLogout(@Param("esntlId") String esntlId, @Param("loggedOutAt") java.time.LocalDateTime loggedOutAt);

    /**
     * 세션차수를 한 문장으로 1 올린다(V2_153). 그 전에 발급된 access·refresh token 이 모두 거부된다 — 비밀번호 변경·초기화,
     * 계정 상태 변경, 로그인 실패 잠금, 관리자 강제 로그아웃이 부른다. 엔티티의 {@code ssnCycl} 은 읽기 전용이라 이 UPDATE 만
     * 쓰고, 겹친 증가도 서로 덮지 않는다. 감사 컬럼은 바꾸지 않는다. 앞서 바꾼 엔티티를 먼저 반영한다(같은 행을 이어 쓰는 순서).
     */
    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true)
    @Query(value = "UPDATE tb_user_info SET ssn_cycl = ssn_cycl + 1 WHERE esntl_id IN (:esntlIds)", nativeQuery = true)
    int advanceSessionCycle(@Param("esntlIds") java.util.Collection<String> esntlIds);
}
