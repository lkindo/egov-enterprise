package com.company.project.domain.community;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CommunityUserRepository extends JpaRepository<CommunityUser, CommunityUserId> {

    Page<CommunityUser> findByCmmntyIdAndUseAt(String cmmntyId, String useAt, Pageable pageable);

    // Check if user is manager
    boolean existsByCmmntyIdAndEmplyrIdAndMngrAtAndUseAt(String cmmntyId, String emplyrId, String mngrAt, String useAt);

    Optional<CommunityUser> findByCmmntyIdAndEmplyrId(String cmmntyId, String emplyrId);
}
