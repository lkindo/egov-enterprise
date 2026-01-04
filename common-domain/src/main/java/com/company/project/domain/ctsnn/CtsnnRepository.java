package com.company.project.domain.ctsnn;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CtsnnRepository extends JpaRepository<Ctsnn, String> {
}
