package nuri.business.domain.board;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** 게시글 추천 이력 저장소. 추천은 {@code BoardService#incrementLike} 만 쓴다. */
public interface BoardRecommendationRepository extends JpaRepository<BoardRecommendation, BoardRecommendationId> {

    /** 주어진 글 가운데 이 사용자가 추천한 글 번호 — 목록 한 페이지의 '추천함' 표시를 한 번에 채운다. */
    @Query("select r.pstSn from BoardRecommendation r where r.userId = :userId and r.pstSn in :pstSns")
    List<Long> findRecommendedPstSns(@Param("userId") String userId, @Param("pstSns") Collection<Long> pstSns);
}
