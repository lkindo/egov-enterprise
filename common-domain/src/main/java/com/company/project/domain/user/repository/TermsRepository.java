package com.company.project.domain.user.repository;

import com.company.project.domain.user.entity.*;


import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("userTermsRepository")
public interface TermsRepository extends JpaRepository<TermsInfo, String> {
}
