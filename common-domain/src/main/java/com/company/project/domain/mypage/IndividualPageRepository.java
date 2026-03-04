package com.company.project.domain.mypage;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface IndividualPageRepository extends JpaRepository<IndividualPage, String> {
    Optional<IndividualPage> findByUserId(String userId);
}