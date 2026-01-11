package com.company.project.domain.mypage;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IndvdlPgeRepository extends JpaRepository<IndvdlPge, String> {
}
