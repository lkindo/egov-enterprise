package com.company.project.domain.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface BoardRepository extends JpaRepository<Board, BoardId>, BoardRepositoryCustom {
        @Query("SELECT COALESCE(MAX(b.id.nttId), 0) FROM Board b")
        Long findMaxNttId();

        @Query("SELECT COALESCE(MAX(b.sortOrdr), 0) FROM Board b WHERE b.id.bbsId = :bbsId")
        Long findMaxSortOrdr(@Param("bbsId") String bbsId);

        @Query("SELECT COALESCE(MAX(b.nttNo), 0) FROM Board b WHERE b.id.bbsId = :bbsId AND b.sortOrdr = :sortOrdr")
        Long findMaxNttNo(@Param("bbsId") String bbsId, @Param("sortOrdr") Long sortOrdr);
}
