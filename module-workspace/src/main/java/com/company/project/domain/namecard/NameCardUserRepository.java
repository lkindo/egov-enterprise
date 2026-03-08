package com.company.project.domain.namecard;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Optional;

/**
 * 嶺뚮ㅏ援잓뇡??????筌먲퐢沅?Repository
 */
public interface NameCardUserRepository extends JpaRepository<NameCardUser, NameCardUserId> {

    Optional<NameCardUser> findByNcrdIdAndEmplyrId(String ncrdId, String emplyrId);

    @Query("SELECT nu FROM NameCardUser nu WHERE nu.emplyrId = :emplyrId AND nu.useAt = 'Y'")
    Page<NameCardUser> findMyNameCardUsers(@Param("emplyrId") String emplyrId, Pageable pageable);
}
