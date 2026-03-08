package com.company.project.domain.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.lang.NonNull;
import org.springframework.transaction.annotation.Transactional;
import java.util.Optional;

public interface AuthorityRepository extends JpaRepository<Authority, String>, AuthorityRepositoryCustom {

    @Override
    @NonNull
    Optional<Authority> findById(@NonNull String authorCode);

    @Override
    @Transactional
    void deleteById(@NonNull String authorCode);

    @Query("SELECT a FROM Authority a WHERE a.authorNm LIKE %:searchKeyword% OR a.authorCode LIKE %:searchKeyword%")
    Page<Authority> searchByKeyword(@Param("searchKeyword") @NonNull String searchKeyword, @NonNull Pageable pageable);
}
