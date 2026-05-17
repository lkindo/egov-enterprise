package nuri.business.domain.board;

import org.springframework.lang.NonNull;
import java.util.Optional;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface BoardRepository extends JpaRepository<Board, String>, BoardRepositoryCustom {
        @Override
        @NonNull
        Optional<Board> findById(@NonNull String id);

        @Override
        @Transactional
        void deleteById(@NonNull String id);

        @Query("SELECT COALESCE(MAX(b.sortOrdr), 0L) FROM Board b WHERE b.bbsId = :bbsId")
        Long findMaxSortOrdr(@Param("bbsId") String bbsId);

        @Query("SELECT COALESCE(MAX(b.pstSn), 0L) FROM Board b WHERE b.bbsId = :bbsId AND b.sortOrdr = :sortOrdr")
        Long findMaxPstSn(@Param("bbsId") String bbsId, @Param("sortOrdr") Long sortOrdr);

        @Query("SELECT b FROM Board b WHERE b.pstId = :pstId")
        Optional<Board> findByPstId(@Param("pstId") String pstId);

        long countByBbsIdAndUseYn(String bbsId, String useYn);

        @Query("SELECT COALESCE(SUM(b.inqCnt), 0L) FROM Board b WHERE b.bbsId = :bbsId AND b.useYn = :useYn")
        long sumInqCntByBbsIdAndUseYn(@Param("bbsId") String bbsId, @Param("useYn") String useYn);

        @Query("SELECT b.userNm FROM Board b WHERE b.bbsId = :bbsId AND b.useYn = :useYn GROUP BY b.userNm ORDER BY COUNT(b) DESC LIMIT 1")
        String findTopContributorByBbsIdAndUseYn(@Param("bbsId") String bbsId, @Param("useYn") String useYn);
}
