package com.company.project.domain.trouble;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TroblRepository extends JpaRepository<Trobl, String>, TroblRepositoryCustom {
}
