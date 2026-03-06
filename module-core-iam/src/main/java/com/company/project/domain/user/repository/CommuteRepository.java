package com.company.project.domain.user.repository;

import com.company.project.domain.user.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface CommuteRepository extends JpaRepository<Commute, String> {
    Optional<Commute> findByUserIdAndStartTimeIsNotNullAndEndTimeIsNull(String userId);
}
