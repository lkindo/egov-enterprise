package nuri.business.domain.board;

import org.springframework.lang.NonNull;
import java.util.Optional;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface BoardRepository extends JpaRepository<Board, Long>, BoardRepositoryCustom {
        @Override
        @NonNull
        Optional<Board> findById(@NonNull Long id);

        @Override
        @Transactional
        void deleteById(@NonNull Long id);

        @Query("SELECT COALESCE(MAX(b.sortOrdr), 0L) FROM Board b WHERE b.bbsId = :bbsId")
        Long findMaxSortOrdr(@Param("bbsId") String bbsId);

        @Query("SELECT COALESCE(MAX(b.nttNo), 0L) FROM Board b WHERE b.bbsId = :bbsId AND b.sortOrdr = :sortOrdr")
        Long findMaxNttNo(@Param("bbsId") String bbsId, @Param("sortOrdr") Long sortOrdr);

        @Query("SELECT COALESCE(MAX(b.nttId), 0L) FROM Board b")
        Long findMaxNttId();

        long countByBbsIdAndUseAt(String bbsId, String useAt);

        @Query("SELECT COALESCE(SUM(b.inqireCo), 0L) FROM Board b WHERE b.bbsId = :bbsId AND b.useAt = :useAt")
        long sumInqireCoByBbsIdAndUseAt(@Param("bbsId") String bbsId, @Param("useAt") String useAt);

        @Query("SELECT b.ntcrNm FROM Board b WHERE b.bbsId = :bbsId AND b.useAt = :useAt GROUP BY b.ntcrNm ORDER BY COUNT(b) DESC LIMIT 1")
        String findTopContributorByBbsIdAndUseAt(@Param("bbsId") String bbsId, @Param("useAt") String useAt);
}
