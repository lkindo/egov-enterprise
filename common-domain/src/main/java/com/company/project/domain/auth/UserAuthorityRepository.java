package com.company.project.domain.auth;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserAuthorityRepository extends JpaRepository<UserAuthority, String>, UserAuthorityRepositoryCustom {

    @EntityGraph(attributePaths = {"authorCode"})
    Optional<UserAuthority> findById(String uniqId);

    @Query("SELECT ua FROM UserAuthority ua WHERE ua.uniqId IN :uniqIds")
    List<UserAuthority> findByUniqIdIn(@Param("uniqIds") List<String> uniqIds);
}
