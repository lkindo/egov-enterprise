package com.company.project.domain.terms;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CpyrhtPrtcPolicyRepository extends JpaRepository<CpyrhtPrtcPolicy, String> {
}