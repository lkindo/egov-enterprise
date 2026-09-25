package nuri.business.domain.board;

import org.springframework.data.jpa.repository.JpaRepository;

/** 게시글 추천 이력 저장소. 추천은 {@code BoardService#incrementLike} 만 쓴다. */
public interface BoardRecommendationRepository extends JpaRepository<BoardRecommendation, BoardRecommendationId> {
}
