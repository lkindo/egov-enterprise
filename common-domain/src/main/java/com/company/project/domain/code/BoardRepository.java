package com.company.project.domain.code;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BoardRepository extends JpaRepository<Board, BoardId> {
    Page<Board> findByBoardMasterAndUseAt(BoardMaster boardMaster, String useAt, Pageable pageable);

    @org.springframework.data.jpa.repository.Query("SELECT b FROM Board b WHERE b.id = :id")
    java.util.Optional<Board> findByIdOnly(@org.springframework.data.repository.query.Param("id") Long id);
}
