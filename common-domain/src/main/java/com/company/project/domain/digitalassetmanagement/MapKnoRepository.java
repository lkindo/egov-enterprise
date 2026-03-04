package com.company.project.domain.digitalassetmanagement;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.querydsl.QuerydslPredicateExecutor;

public interface MapKnoRepository
        extends JpaRepository<MapKno, String>, QuerydslPredicateExecutor<MapKno>, MapKnoRepositoryCustom {
}