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

    // [2026-09-25 DIP I6 ⑥] 관리자 댓글 관리 목록. 게시판·글을 고르지 않은 전체 목록을 위해
    //   필터 조합마다 파생 쿼리를 둔다 — 위 findByBbsIdAndPstSn 에 null 을 넘기면 `bbs_id = NULL`
    //   이 되어 늘 0건이었다. `:p IS NULL OR ...` JPQL 대신 조합별 쿼리를 쓰는 것은 PostgreSQL 이
    //   타입 없는 null 파라미터를 거부하는 경로를 만들지 않기 위해서다.
    Page<Comment> findByUseYn(String useYn, Pageable pageable);

    Page<Comment> findByBbsIdAndUseYn(String bbsId, String useYn, Pageable pageable);

    Page<Comment> findByPstSnAndUseYn(Long pstSn, String useYn, Pageable pageable);

    /**
     * [Top 1c] {@code BOARD_READ_ALL} 이 없는 댓글 관리자({@code COMMENT_READ_ALL} 만 보유)가 목록에서
     * 타인의 비밀글·게시 기간 밖 글·비활성 게시판·비가입 커뮤니티의 댓글을 보지 못하게 거른다.
     *
     * <p>Oracle 에서 {@code = ''} 는 {@code UNKNOWN} 이므로 빈 문자열 판정은 {@code length(...) = 0} 을 쓰고,
     * PostgreSQL 타입 미지정 null 오류를 막기 위해 필터 조합별로 메서드를 나눈다. 커뮤니티 엔티티는 선택 도메인이라
     * {@code CommunityBoardAccessPort} 로 조회한 허용 커뮤니티 ID 집합만 받는다.
     */
    String BASE_VISIBLE_POST_PREFIX = "EXISTS ("
            + "SELECT b.pstSn FROM Board b, BoardMaster m "
            + "WHERE b.pstSn = c.pstSn AND b.bbsId = c.bbsId AND b.useYn = 'Y' "
            + "AND m.bbsId = b.bbsId AND m.useYn = 'Y' "
            + "AND (b.scrtYn IS NULL OR length(b.scrtYn) = 0 OR b.scrtYn = 'N' OR b.userId = :viewerEsntlId) "
            + "AND (((b.pstBgngYmd IS NULL OR length(b.pstBgngYmd) = 0 OR b.pstBgngYmd <= :today) "
            + "      AND (b.pstEndYmd IS NULL OR length(b.pstEndYmd) = 0 OR b.pstEndYmd >= :today)) "
            + "     OR b.userId = :viewerEsntlId) ";

    String VISIBLE_PUBLIC_MODERATION_PREDICATE =
            BASE_VISIBLE_POST_PREFIX + "AND m.cmntySn IS NULL)";

    String VISIBLE_COMMUNITY_MODERATION_PREDICATE =
            BASE_VISIBLE_POST_PREFIX + "AND (m.cmntySn IS NULL OR m.cmntySn IN :accessibleCommunityIds))";

    @Query("SELECT c FROM Comment c WHERE c.useYn = 'Y' AND " + VISIBLE_PUBLIC_MODERATION_PREDICATE)
    Page<Comment> findVisiblePublicForModeration(
            @Param("viewerEsntlId") String viewerEsntlId,
            @Param("today") String today,
            Pageable pageable);

    @Query("SELECT c FROM Comment c WHERE c.useYn = 'Y' AND c.bbsId = :bbsId AND " + VISIBLE_PUBLIC_MODERATION_PREDICATE)
    Page<Comment> findVisiblePublicForModerationByBbsId(
            @Param("bbsId") String bbsId,
            @Param("viewerEsntlId") String viewerEsntlId,
            @Param("today") String today,
            Pageable pageable);

    @Query("SELECT c FROM Comment c WHERE c.useYn = 'Y' AND c.pstSn = :pstSn AND " + VISIBLE_PUBLIC_MODERATION_PREDICATE)
    Page<Comment> findVisiblePublicForModerationByPstSn(
            @Param("pstSn") Long pstSn,
            @Param("viewerEsntlId") String viewerEsntlId,
            @Param("today") String today,
            Pageable pageable);

    @Query("SELECT c FROM Comment c WHERE c.useYn = 'Y' AND c.bbsId = :bbsId AND c.pstSn = :pstSn AND "
            + VISIBLE_PUBLIC_MODERATION_PREDICATE)
    Page<Comment> findVisiblePublicForModerationByBbsIdAndPstSn(
            @Param("bbsId") String bbsId,
            @Param("pstSn") Long pstSn,
            @Param("viewerEsntlId") String viewerEsntlId,
            @Param("today") String today,
            Pageable pageable);

    @Query("SELECT c FROM Comment c WHERE c.useYn = 'Y' AND " + VISIBLE_COMMUNITY_MODERATION_PREDICATE)
    Page<Comment> findVisibleForModeration(
            @Param("viewerEsntlId") String viewerEsntlId,
            @Param("today") String today,
            @Param("accessibleCommunityIds") java.util.Collection<Long> accessibleCommunityIds,
            Pageable pageable);

    @Query("SELECT c FROM Comment c WHERE c.useYn = 'Y' AND c.bbsId = :bbsId AND " + VISIBLE_COMMUNITY_MODERATION_PREDICATE)
    Page<Comment> findVisibleForModerationByBbsId(
            @Param("bbsId") String bbsId,
            @Param("viewerEsntlId") String viewerEsntlId,
            @Param("today") String today,
            @Param("accessibleCommunityIds") java.util.Collection<Long> accessibleCommunityIds,
            Pageable pageable);

    @Query("SELECT c FROM Comment c WHERE c.useYn = 'Y' AND c.pstSn = :pstSn AND " + VISIBLE_COMMUNITY_MODERATION_PREDICATE)
    Page<Comment> findVisibleForModerationByPstSn(
            @Param("pstSn") Long pstSn,
            @Param("viewerEsntlId") String viewerEsntlId,
            @Param("today") String today,
            @Param("accessibleCommunityIds") java.util.Collection<Long> accessibleCommunityIds,
            Pageable pageable);

    @Query("SELECT c FROM Comment c WHERE c.useYn = 'Y' AND c.bbsId = :bbsId AND c.pstSn = :pstSn AND "
            + VISIBLE_COMMUNITY_MODERATION_PREDICATE)
    Page<Comment> findVisibleForModerationByBbsIdAndPstSn(
            @Param("bbsId") String bbsId,
            @Param("pstSn") Long pstSn,
            @Param("viewerEsntlId") String viewerEsntlId,
            @Param("today") String today,
            @Param("accessibleCommunityIds") java.util.Collection<Long> accessibleCommunityIds,
            Pageable pageable);

    // [W1-25 P3② 삭제] findMaxId() 제거 — 저장소 전역 호출부 0(선언 1건뿐).
    //   WHERE 절이 전혀 없는 **전역** MAX(ans_sn) 채번이라, 살아 있었다면 게시글 경계를 넘어
    //   댓글 순번이 뒤엉키는 구조였다. 실제 댓글 PK 는 JpaRepository<Comment, Long> 표준 경로를 쓴다.

    long countByBbsIdAndPstSnAndUseYn(String bbsId, Long pstSn, String useYn);

    /**
     * 본문 수정과 논리 삭제를 직렬화한다.
     *
     * <p>활성 행만 잠근다. 잠금 대기 중 선행 트랜잭션이 {@code useYn=N}으로 바꾸면 후행
     * 쿼리는 빈 결과가 되어 기존 {@code COMMENT_NOT_FOUND} 의미를 유지하고, 감소 이벤트도
     * 한 번만 발행된다. 수정도 같은 잠금을 사용해 삭제 전 스냅샷으로 활성 상태를 되살리지 않는다.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Comment c WHERE c.ansSn = :commentNo AND c.useYn = 'Y'")
    Optional<Comment> findByIdForUpdate(@Param("commentNo") Long commentNo);

    /**
     * {@code BOARD_READ_ALL} 이 없는 관리자 삭제용 단건 잠금 조회 — 공개 게시판 중 활성 게시판·공개/기간 내 게시글(또는 작성자 본인) 댓글만 반환한다.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Comment c WHERE c.ansSn = :commentNo AND c.useYn = 'Y' AND " + VISIBLE_PUBLIC_MODERATION_PREDICATE)
    Optional<Comment> findVisiblePublicForModerationUpdate(
            @Param("commentNo") Long commentNo,
            @Param("viewerEsntlId") String viewerEsntlId,
            @Param("today") String today);

    /**
     * {@code BOARD_READ_ALL} 이 없는 관리자 삭제용 단건 잠금 조회 — 공개 게시판 또는 가입 커뮤니티 중 열람 가능한 활성 댓글만 반환한다.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Comment c WHERE c.ansSn = :commentNo AND c.useYn = 'Y' AND " + VISIBLE_COMMUNITY_MODERATION_PREDICATE)
    Optional<Comment> findVisibleForModerationUpdate(
            @Param("commentNo") Long commentNo,
            @Param("viewerEsntlId") String viewerEsntlId,
            @Param("today") String today,
            @Param("accessibleCommunityIds") java.util.Collection<Long> accessibleCommunityIds);

    // [V2_12 결속] 사용자 삭제 시 댓글 작성자를 시스템 계정으로 재귀속 — 콘텐츠 보존 정책
    // (fk_tb_bbs_comment_tb_user_info NO ACTION 하에서 작성자 행 삭제 전 필수)
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Comment c SET c.wrterId = :newWrterId WHERE c.wrterId IN :wrterIds")
    int reassignWriterByWrterIdIn(@Param("wrterIds") List<String> wrterIds,
            @Param("newWrterId") String newWrterId);
}
