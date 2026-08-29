package nuri.business.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.NonNull;
import java.util.List;
import java.util.Optional;

public interface UserAuthorityRepository extends JpaRepository<UserAuthority, String>, UserAuthorityRepositoryCustom {
    @NonNull
    Optional<UserAuthority> findById(@NonNull String scrtyDcsnTrgtId);

    @Query("SELECT ua FROM UserAuthority ua WHERE ua.scrtyDcsnTrgtId IN :scrtyDcsnTrgtIds")
    List<UserAuthority> findByScrtyDcsnTrgtIdIn(@Param("scrtyDcsnTrgtIds") List<String> scrtyDcsnTrgtIds);

    /**
     * 이 권한을 보유한 사용자 수.
     *
     * <p>[2026-08-29] 권한 삭제 가드용이다. tb_user_authrt_map 에는 tb_authrt_info 로의 FK 가
     * 없어(V2_0 은 PK 만, V2_12 는 tb_user_info FK 만 추가) 권한을 지워도 사용자 행이 없어진
     * 권한을 가리킨 채 남는다. 같은 코드로 권한을 다시 만들면 그 사용자들이 아무도 배정하지
     * 않은 권한을 그대로 물려받는다(GAP-AUTH-002).
     */
    long countByAuthrtId(String authrtId);
}
