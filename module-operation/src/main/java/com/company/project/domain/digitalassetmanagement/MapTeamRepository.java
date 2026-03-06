package com.company.project.domain.digitalassetmanagement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;

public interface MapTeamRepository extends JpaRepository<MapTeam, String>, QuerydslPredicateExecutor<MapTeam> {
}
