package com.company.project.domain.roughmap;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RoughMapRepository extends JpaRepository<RoughMap, String> {
}
