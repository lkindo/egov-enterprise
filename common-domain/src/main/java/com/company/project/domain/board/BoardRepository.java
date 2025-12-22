package com.company.project.domain.board;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 게시물 JPA Repository
 */
@Repository
public interface BoardRepository extends JpaRepository<Board, BoardId> {

    Page<Board> findByBoardMasterAndUseAt(BoardMaster boardMaster, String useAt, Pageable pageable);

    @Query("SELECT b FROM Board b WHERE b.id = :id")
    Optional<Board> findByIdOnly(Long id);
}
