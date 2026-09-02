package nuri.business.domain.comment;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CommentRepository extends JpaRepository<Comment, Long> {

    // [2026-08-12 수정] `useYn = 'Y'` 조건이 **없었다.**
    //   `CommentService.deleteComment` 는 물리 삭제가 아니라 `useYn='N'` 을 세우는 **논리 삭제**인데
    //   이 목록 쿼리가 그것을 거르지 않아, 사용자가 댓글을 삭제해도 **목록에서 사라지지 않았다**
    //   (버튼은 눌리고 서버는 200 을 주는데 화면은 그대로다).
    //   같은 저장소의 `countByBbsIdAndPstSnAndUseYn(..., "Y")` 는 이미 살아 있는 것만 세고 있었다 —
    //   '살아 있는 댓글 = useYn Y' 라는 규약은 저장소 자신이 증명한다. 목록만 그 규약에서 벗어나 있었다.
    //   회귀 방어: CommentRepositoryTest (조건을 되돌리면 red).
    @Query("SELECT c FROM Comment c WHERE c.bbsId = :bbsId AND c.pstSn = :pstSn AND c.useYn = 'Y'")
    Page<Comment> findByBbsIdAndPstSn(@Param("bbsId") String bbsId, @Param("pstSn") Long pstSn, Pageable pageable);

    Page<Comment> findByAnsCnContaining(String ansCn, Pageable pageable);

    // [W1-25 P3② 삭제] findMaxId() 제거 — 저장소 전역 호출부 0(선언 1건뿐).
    //   WHERE 절이 전혀 없는 **전역** MAX(ans_sn) 채번이라, 살아 있었다면 게시글 경계를 넘어
    //   댓글 순번이 뒤엉키는 구조였다. 실제 댓글 PK 는 JpaRepository<Comment, Long> 표준 경로를 쓴다.

    long countByBbsIdAndPstSnAndUseYn(String bbsId, Long pstSn, String useYn);

    /**
     * 논리 삭제 전이를 직렬화한다.
     *
     * <p>활성 행만 잠근다. 잠금 대기 중 선행 트랜잭션이 {@code useYn=N}으로 바꾸면 후행
     * 쿼리는 빈 결과가 되어 기존 {@code COMMENT_NOT_FOUND} 의미를 유지하고, 감소 이벤트도
     * 한 번만 발행된다.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Comment c WHERE c.ansSn = :commentNo AND c.useYn = 'Y'")
    Optional<Comment> findByIdForUpdate(@Param("commentNo") Long commentNo);

    // [V2_12 결속] 사용자 삭제 시 댓글 작성자를 시스템 계정으로 재귀속 — 콘텐츠 보존 정책
    // (fk_tb_bbs_comment_tb_user_info NO ACTION 하에서 작성자 행 삭제 전 필수)
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Comment c SET c.wrterId = :newWrterId WHERE c.wrterId IN :wrterIds")
    int reassignWriterByWrterIdIn(@Param("wrterIds") List<String> wrterIds,
            @Param("newWrterId") String newWrterId);
}
