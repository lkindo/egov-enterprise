package com.company.project.domain.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

import org.springframework.stereotype.Repository;

@Repository("userRepository")
public interface UserRepository extends JpaRepository<User, String>, UserRepositoryCustom {
    Optional<User> findByEsntlId(String esntlId);

    Optional<User> findBySubDn(String subDn);

    Optional<User> findByUserNmAndEmailAdres(String userNm, String emailAdres);

    Optional<User> findByUserIdAndUserNmAndEmailAdres(String userId, String userNm, String emailAdres);
}
