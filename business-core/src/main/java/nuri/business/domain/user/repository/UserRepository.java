package nuri.business.domain.user.repository;

import nuri.business.domain.user.entity.User;
import nuri.business.domain.user.entity.Role;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.Optional;

@Repository("userRepository")
public interface UserRepository extends JpaRepository<User, String>, UserRepositoryCustom {
    Optional<User> findByEsntlId(String esntlId);
    Optional<User> findByUserId(String userId);

    Optional<User> findByCertDnVl(String certDnVl);

    Optional<User> findByUserNmAndEmlAddr(String userNm, String emlAddr);

    Optional<User> findByUserIdAndUserNmAndEmlAddr(String userId, String userNm, String emlAddr);

    @Query("SELECT u FROM User u")
    List<User> findAllWithRole();

    /**
     * [성능 최적화] 사용자와 권한 정보를 한 번에 조회 (N+1 방지)
     */
    @Query("""
                SELECT u, ua
                FROM User u
                LEFT JOIN UserAuthority ua ON u.esntlId = ua.scrtyDcsnTrgtId
                ORDER BY u.esntlId
            """)
    List<Object[]> findAllWithAuthorities();

    @NonNull
    Optional<User> findById(@NonNull @Param("esntlId") String esntlId);

    Page<User> findByUserNmContainingIgnoreCase(String userNm, Pageable pageable);

    Page<User> findByUserIdContainingIgnoreCaseOrUserNmContainingIgnoreCase(String userId, String userNm, Pageable pageable);

    List<User> findByUserNmContaining(String userNm);

    List<User> findByEmlAddrContaining(String emlAddr);

    List<User> findByOgnzId(String ognzId);

    List<User> findByRole(Role role);

    List<User> findByOgnzIdAndRole(String ognzId, Role role);

    List<User> findByUserNmContainingOrEmlAddrContaining(String userNm, String emlAddr);

    // [V2_13 결속] 권한그룹 삭제 시 사용자 참조 해제 (fk_tb_user_info_tb_authrt_group_info NO ACTION)
    @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
    @Query("UPDATE User u SET u.groupId = null WHERE u.groupId IN :groupIds")
    int clearGroupIdByGroupIdIn(@Param("groupIds") List<String> groupIds);
}
