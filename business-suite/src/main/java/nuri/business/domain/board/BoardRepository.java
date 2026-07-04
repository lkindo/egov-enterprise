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

        @Query("SELECT COALESCE(MAX(b.ansSn), 0L) FROM Board b WHERE b.bbsId = :bbsId AND b.sortOrdr = :sortOrdr")
        Long findMaxAnsSn(@Param("bbsId") String bbsId, @Param("sortOrdr") Long sortOrdr);

        @Query("SELECT b FROM Board b WHERE b.pstId = :pstId")
        Optional<Board> findByPstId(@Param("pstId") String pstId);

        @Query(value = "SELECT nextval('pst_id_seq')", nativeQuery = true)
        Long getNextPstId();

        long countByBbsIdAndUseYn(String bbsId, String useYn);

        @Query("SELECT COUNT(b) FROM Board b WHERE b.bbsId = :bbsId")
        long countAllByBbsId(@Param("bbsId") String bbsId);

        @Query("SELECT COALESCE(SUM(b.inqCnt), 0L) FROM Board b WHERE b.bbsId = :bbsId AND b.useYn = :useYn")
        long sumInqCntByBbsIdAndUseYn(@Param("bbsId") String bbsId, @Param("useYn") String useYn);

        @Query("SELECT b.userNm FROM Board b WHERE b.bbsId = :bbsId AND b.useYn = :useYn GROUP BY b.userNm ORDER BY COUNT(b) DESC LIMIT 1")
        String findTopContributorByBbsIdAndUseYn(@Param("bbsId") String bbsId, @Param("useYn") String useYn);

        @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
        @Query("SELECT b FROM Board b WHERE b.pstId = :pstId")
        Optional<Board> findByPstIdWithPessimisticLock(@Param("pstId") String pstId);

        @org.springframework.data.jpa.repository.Modifying
        @Query("UPDATE Board b SET b.likeCnt = COALESCE(b.likeCnt, 0) + 1 WHERE b.pstId = :pstId")
        int incrementLikeCntAtomic(@Param("pstId") String pstId);

        // 조회수 배치 동기화(BoardViewCountService)용 원자 증분. find+setInqCnt+save 방식은
        // @Version 낙관적 잠금 충돌 시 배치 전체가 롤백되며, 이미 비워둔 버퍼가 유실된다.
        // 호출부(BoardViewCountService.syncViewCountsToDb)가 @Transactional 이 아니므로,
        // 이 커스텀 @Query 메서드는 Spring Data 의 기본 트랜잭션 프록시를 타지 않는다 — 명시적으로
        // @Transactional 을 달아야 한다(없으면 TransactionRequiredException 으로 매번 실패한다).
        @Transactional
        @org.springframework.data.jpa.repository.Modifying
        @Query("UPDATE Board b SET b.inqCnt = COALESCE(b.inqCnt, 0) + :delta WHERE b.pstId = :pstId")
        int incrementInqCntAtomic(@Param("pstId") String pstId, @Param("delta") int delta);
}
