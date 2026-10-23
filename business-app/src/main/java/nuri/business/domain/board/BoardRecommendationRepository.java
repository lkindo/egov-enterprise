package nuri.business.domain.board;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 게시글 추천 이력 저장소. 추천은 {@code BoardService#incrementLike}, 추천 취소는 {@code BoardService#cancelLike} 만 쓴다
 * (ADR-0040 결정 6).
 */
public interface BoardRecommendationRepository extends JpaRepository<BoardRecommendation, BoardRecommendationId> {

    /** 주어진 글 가운데 이 사용자가 추천한 글 번호 — 목록 한 페이지의 '추천함' 표시를 한 번에 채운다. */
    @Query("select r.pstSn from BoardRecommendation r where r.userId = :userId and r.pstSn in :pstSns")
    List<Long> findRecommendedPstSns(@Param("userId") String userId, @Param("pstSns") Collection<Long> pstSns);

    /**
     * 이 사용자의 이 글 추천 이력을 지운다 — 추천 취소의 유일한 쓰기다. 영향 수(0 또는 1)가 추천 수를 줄일지의 판정 재료다.
     *
     * <p>한 문장 DELETE 다. 파생 {@code deleteBy…}·{@code deleteById} 는 읽은 뒤 지우므로, 같은 사람의 동시 취소가 둘 다 '있음' 을
     * 보고 추천 수를 두 번 줄이거나 낙관적 잠금 예외를 낸다. 한 문장이면 두 번째 DELETE 는 첫 커밋을 기다렸다가 0행이 된다.
     */
    @org.springframework.transaction.annotation.Transactional
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from BoardRecommendation r where r.pstSn = :pstSn and r.userId = :userId")
    int deleteRecommendation(@Param("pstSn") Long pstSn, @Param("userId") String userId);
}
