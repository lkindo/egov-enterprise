package nuri.business.domain.comment;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    @Query("SELECT c FROM Comment c WHERE c.bbsId = :bbsId AND c.pstId = :pstId")
    Page<Comment> findByBbsIdAndPstId(@Param("bbsId") String bbsId, @Param("pstId") String pstId, Pageable pageable);

    Page<Comment> findByAnsCnContaining(String ansCn, Pageable pageable);

    // [W1-25 P3② 삭제] findMaxId() 제거 — 저장소 전역 호출부 0(선언 1건뿐).
    //   WHERE 절이 전혀 없는 **전역** MAX(ans_sn) 채번이라, 살아 있었다면 게시글 경계를 넘어
    //   댓글 순번이 뒤엉키는 구조였다. 실제 댓글 PK 는 JpaRepository<Comment, Long> 표준 경로를 쓴다.

    long countByBbsIdAndPstIdAndUseYn(String bbsId, String pstId, String useYn);

    // [V2_12 결속] 사용자 삭제 시 댓글 작성자를 시스템 계정으로 재귀속 — 콘텐츠 보존 정책
    // (fk_tb_bbs_comment_tb_user_info NO ACTION 하에서 작성자 행 삭제 전 필수)
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Comment c SET c.wrterId = :newWrterId WHERE c.wrterId IN :wrterIds")
    int reassignWriterByWrterIdIn(@Param("wrterIds") List<String> wrterIds,
            @Param("newWrterId") String newWrterId);
}
