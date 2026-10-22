package nuri.business.domain.cms;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface CmsSiteSettingRepository extends JpaRepository<CmsSiteSetting, Long> {

    Optional<CmsSiteSetting> findByStngCd(String stngCd);

    /**
     * 홈 지정과 게시 중지를 직렬화한다. 두 작업 모두 이 행을 먼저 잠근 뒤 콘텐츠 행을 잠근다 — 순서가 같아 교착이 없고,
     * 게시 중지된 페이지를 홈으로 남기는 경합을 막는다.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM CmsSiteSetting s WHERE s.stngCd = :stngCd")
    Optional<CmsSiteSetting> findByStngCdForUpdate(@Param("stngCd") String stngCd);
}
