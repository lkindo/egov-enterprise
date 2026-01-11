package com.company.project.domain.help;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HpcmRepository extends JpaRepository<Hpcm, String> {
}
