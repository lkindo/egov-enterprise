package com.company.project.domain.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * 게시판 마스터 JPA Repository
 */
@Repository
public interface BoardMasterRepository extends JpaRepository<BoardMaster, String>, BoardMasterRepositoryCustom {
}
