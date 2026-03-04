package com.company.project.domain.comment;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @Query("SELECT c FROM Comment c WHERE c.bbsId = :bbsId AND c.nttId = :nttId")
    Page<Comment> findByBbsIdAndNttId(@Param("bbsId") String bbsId, @Param("nttId") Long nttId, Pageable pageable);

    Page<Comment> findByCommentCnContaining(String commentCn, Pageable pageable);

    @Query("SELECT COALESCE(MAX(c.id), 0) FROM Comment c")
    Long findMaxId();
}