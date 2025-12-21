package com.company.project.domain.code;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface BoardMasterRepository extends JpaRepository<BoardMaster, String> {
}
