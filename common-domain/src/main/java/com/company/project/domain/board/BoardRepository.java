package com.company.project.domain.board;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * 게시물 JPA Repository
 */
@Repository
public interface BoardRepository extends JpaRepository<Board, BoardId> {

        Page<Board> findByBoardMasterAndUseAtOrderBySortOrdrDescNttNoAsc(BoardMaster boardMaster, String useAt,
                        Pageable pageable);

        Page<Board> findByBoardMasterAndUseAtAndNttSjContainingOrderBySortOrdrDescNttNoAsc(BoardMaster boardMaster,
                        String useAt, String nttSj, Pageable pageable);

        Page<Board> findByBoardMasterAndUseAtAndNttCnContainingOrderBySortOrdrDescNttNoAsc(BoardMaster boardMaster,
                        String useAt, String nttCn, Pageable pageable);

        Page<Board> findByBoardMasterAndUseAtAndAuthorUserNmContainingOrderBySortOrdrDescNttNoAsc(
                        BoardMaster boardMaster,
                        String useAt, String userNm, Pageable pageable);

        /**
         * NTT_ID만으로 게시물 조회 (단일 결과 반환)
         * 주의: id가 테이블 전체적으로 유니크하다고 가정
         */
        @Query("SELECT b FROM Board b WHERE b.id = :nttId")
        Optional<Board> findByNttId(@Param("nttId") Long nttId);

        /**
         * NTT_ID와 BBS_ID로 게시물 조회 (복합 키 전체)
         */
        @Query("SELECT b FROM Board b WHERE b.id = :nttId AND b.boardMaster.bbsId = :bbsId")
        Optional<Board> findByNttIdAndBbsId(@Param("nttId") Long nttId, @Param("bbsId") String bbsId);

        @Query("SELECT COALESCE(MAX(b.id), 0L) + 1 FROM Board b")
        Long getNextNttId();

        @Query("SELECT COALESCE(MAX(b.sortOrdr), 0L) + 1 FROM Board b WHERE b.boardMaster = :boardMaster")
        Long getMaxSortOrdr(@Param("boardMaster") BoardMaster boardMaster);

        @Query("SELECT COALESCE(MAX(b.nttNo), 0L) + 1 FROM Board b WHERE b.boardMaster = :boardMaster AND b.sortOrdr = :sortOrdr")
        Long getMaxNttNo(@Param("boardMaster") BoardMaster boardMaster, @Param("sortOrdr") Long sortOrdr);
}
