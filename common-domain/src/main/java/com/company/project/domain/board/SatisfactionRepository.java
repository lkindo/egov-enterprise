package com.company.project.domain.board;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SatisfactionRepository extends JpaRepository<Satisfaction, String> {
    List<Satisfaction> findByArticleIdAndBoardId(Long articleId, String boardId);

    @Query("SELECT AVG(s.satisfactionLevel) FROM Satisfaction s WHERE s.articleId = :articleId AND s.boardId = :boardId")
    Double getAverageSatisfaction(@Param("articleId") Long articleId, @Param("boardId") String boardId);
}
