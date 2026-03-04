package com.company.project.domain.user.repository;

import com.company.project.domain.user.entity.*;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

import org.springframework.stereotype.Repository;

@Repository("generalUserRepository")
public interface GeneralUserRepository extends JpaRepository<GeneralUser, String>, GeneralUserRepositoryCustom {
    Optional<GeneralUser> findByMberId(String mberId);

    Optional<GeneralUser> findByEsntlId(String esntlId);

    Optional<GeneralUser> findByMberNmAndMberEmailAdres(String mberNm, String mberEmailAdres);

    Optional<GeneralUser> findByMberIdAndMberNmAndMberEmailAdres(String mberId, String mberNm, String mberEmailAdres);
}