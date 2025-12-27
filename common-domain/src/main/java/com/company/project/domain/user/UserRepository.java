package com.company.project.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, String>, UserRepositoryCustom {
    Optional<User> findByEsntlId(String esntlId);

    Optional<User> findByUserNmAndEmailAdres(String userNm, String emailAdres);

    Optional<User> findByUserIdAndUserNmAndEmailAdres(String userId, String userNm, String emailAdres);
}
