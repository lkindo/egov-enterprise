package com.company.project.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface GeneralUserRepository extends JpaRepository<GeneralUser, String>, GeneralUserRepositoryCustom {
    Optional<GeneralUser> findByMberId(String mberId);
}
