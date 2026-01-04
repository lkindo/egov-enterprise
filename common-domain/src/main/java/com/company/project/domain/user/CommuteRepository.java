package com.company.project.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CommuteRepository extends JpaRepository<Commute, String> {
    Optional<Commute> findByUserIdAndStartTimeIsNotNullAndEndTimeIsNull(String userId);
}
