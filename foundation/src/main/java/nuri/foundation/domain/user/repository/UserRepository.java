package nuri.foundation.domain.user.repository;

import nuri.foundation.domain.user.entity.User;
import nuri.foundation.domain.user.entity.Role;
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

    Optional<User> findBySubDn(String subDn);

    Optional<User> findByUserNmAndEmailAdres(String userNm, String emailAdres);

    Optional<User> findByUserIdAndUserNmAndEmailAdres(String userId, String userNm, String emailAdres);

    @Query("SELECT u FROM User u")
    List<User> findAllWithRole();

    /**
     * [성능 최적화] 사용자와 권한 정보를 한 번에 조회 (N+1 방지)
     */
    @Query("""
                SELECT u, ua
                FROM User u
                LEFT JOIN UserAuthority ua ON u.esntlId = ua.uniqId
                ORDER BY u.esntlId
            """)
    List<Object[]> findAllWithAuthorities();

    @NonNull
    Optional<User> findById(@NonNull @Param("userId") String userId);

    Page<User> findByUserNmContainingIgnoreCase(String userNm, Pageable pageable);

    List<User> findByUserNmContaining(String userNm);

    List<User> findByEmailAdresContaining(String emailAdres);

    List<User> findByOrgnztId(String orgnztId);

    List<User> findByRole(Role role);

    List<User> findByOrgnztIdAndRole(String orgnztId, Role role);

    List<User> findByUserNmContainingOrEmailAdresContaining(String userNm, String emailAdres);
}
