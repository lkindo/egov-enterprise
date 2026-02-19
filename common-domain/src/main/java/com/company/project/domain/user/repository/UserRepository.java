package com.company.project.domain.user.repository;

import com.company.project.domain.user.entity.*;


import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;
import org.springframework.lang.NonNull;

@Repository("userRepository")
public interface UserRepository extends JpaRepository<User, String>, UserRepositoryCustom {
    Optional<User> findByEsntlId(String esntlId);

    Optional<User> findBySubDn(String subDn);

    Optional<User> findByUserNmAndEmailAdres(String userNm, String emailAdres);

    Optional<User> findByUserIdAndUserNmAndEmailAdres(String userId, String userNm, String emailAdres);

    @EntityGraph(attributePaths = { "role" })
    @Query("SELECT u FROM User u")
    List<User> findAllWithRole();

    @EntityGraph(attributePaths = { "role" })
    @NonNull
    Optional<User> findById(@NonNull @Param("userId") String userId);

    List<User> findByUserNmContaining(String userNm);

    List<User> findByEmailAdresContaining(String emailAdres);

    List<User> findByOrgnztId(String orgnztId);

    List<User> findByRole(Role role);

    List<User> findByOrgnztIdAndRole(String orgnztId, Role role);

    List<User> findByUserNmContainingOrEmailAdresContaining(String userNm, String emailAdres);
}
