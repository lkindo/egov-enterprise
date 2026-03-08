package com.company.project.domain.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface SatisfactionRepository extends JpaRepository<Satisfaction, Long> {
    List<Satisfaction> findByArticleIdAndBoardIdAndUseAt(Long articleId, String boardId, String useAt);

    @Query("SELECT COALESCE(AVG(s.satisfactionLevel), 0) FROM Satisfaction s WHERE s.articleId = :articleId AND s.boardId = :boardId AND s.useAt = 'Y'")
    Double getAverageSatisfaction(@Param("articleId") Long articleId, @Param("boardId") String boardId);
}
