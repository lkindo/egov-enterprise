package com.company.project.domain.terms;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository("termsRepository")
public interface TermsRepository extends JpaRepository<Terms, String> {
}
