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

        /**
         * 게시판 내 최대 정렬순번. <b>네이티브 쿼리인 이유가 핵심이다.</b>
         *
         * <p>Board 엔티티에는 {@code @Filter(name="softDeleteFilter", condition="use_yn = :useYn")} 가
         * 걸려 있어, JPQL 로 MAX 를 구하면 <b>숨김(use_yn='N') 행이 집계에서 빠진다.</b> 그런데 유니크 제약
         * {@code uk_tb_bbs_item_thread_pos = UNIQUE(bbs_id, sort_ordr, ans_sn)} 는 숨김 행도 그대로 점유한다.
         * 그래서 상위 순번 글이 숨김 처리되면 MAX 가 낮게 나오고, 새 글이 이미 점유된 순번을 받아
         * <b>duplicate key → 409</b> 로 등록이 영구 실패했다(2026-07-27 신규 DB E2E 재현으로 확인:
         * 전 행이 use_yn='N' 이고 max(sort_ordr)=4 인데 필터된 MAX 는 0 이라 sort_ordr=1 충돌).
         *
         * <p>네이티브 쿼리는 Hibernate 필터의 영향을 받지 않으므로 <b>제약이 보는 것과 동일한 집합</b>을 본다.
         */
        @Query(value = "SELECT COALESCE(MAX(sort_ordr), 0) FROM tb_bbs_item WHERE bbs_id = :bbsId",
                        nativeQuery = true)
        Long findMaxSortOrdr(@Param("bbsId") String bbsId);

        /** 답글 순번도 같은 이유로 네이티브 — 유니크 제약(bbs_id, sort_ordr, ans_sn)이 숨김 행까지 포함하기 때문. */
        @Query(value = "SELECT COALESCE(MAX(ans_sn), 0) FROM tb_bbs_item WHERE bbs_id = :bbsId AND sort_ordr = :sortOrdr",
                        nativeQuery = true)
        Long findMaxAnsSn(@Param("bbsId") String bbsId, @Param("sortOrdr") Long sortOrdr);

        @Query("SELECT b FROM Board b WHERE b.pstId = :pstId")
        Optional<Board> findByPstId(@Param("pstId") String pstId);

        @Query(value = "SELECT nextval('sq_pst_id')", nativeQuery = true)
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

        /**
         * 좋아요 수 원자 증가. [W1-17 배선 완료]
         *
         * <p>종전 경로({@code Board.increaseLikeCnt()})는 엔티티를 읽어 필드를 증가시키는
         * <b>비원자 read-modify-write</b> 라 동시 요청에서 증가분이 유실됐다.
         *
         * <p>네이티브인 이유는 아래 {@link #increaseInqCntAtomic} 과 같다 — {@code version} 컬럼을
         * 건드리지 않아 편집자의 낙관적 락을 오염시키지 않는다.
         * {@code clearAutomatically} 로 1차 캐시의 스테일 엔티티를 비워, 갱신 후 재조회가 실제 값을 읽게 한다.
         */
        @org.springframework.transaction.annotation.Transactional
        @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
        @Query(value = "UPDATE tb_bbs_item SET like_cnt = COALESCE(like_cnt, 0) + 1 WHERE pst_id = :pstId",
                        nativeQuery = true)
        int incrementLikeCntAtomic(@Param("pstId") String pstId);

        /**
         * 조회수 원자 증가. [W1-17]
         *
         * <p>[왜 네이티브인가 — 두 가지]
         * <ol>
         *   <li><b>{@code version} 을 건드리지 않는다.</b> JPQL 벌크 UPDATE 나 엔티티 저장은 낙관적 락
         *       버전을 올린다. 조회수는 초 단위로 오르므로, 그때마다 version 이 올라가면
         *       <b>아무도 고치지 않았는데 인기글 편집이 409 로 실패</b>한다 — 실제로 그랬다.</li>
         *   <li>이 리포지토리의 소프트 삭제 필터 영향을 받지 않는다(같은 파일 상단 주석 참조).</li>
         * </ol>
         *
         * <p>메서드 레벨 {@code @Transactional} 은 이 파일의 {@code deleteById} 선례를 따른다.
         * 건별 트랜잭션이라 한 건의 실패가 배치 전체를 되돌리지 않는다.
         *
         * @return 영향 행 수. 0 이면 해당 게시글이 없다(삭제된 글의 조회수 등).
         */
        @org.springframework.transaction.annotation.Transactional
        @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
        @Query(value = "UPDATE tb_bbs_item SET inq_cnt = COALESCE(inq_cnt, 0) + :delta WHERE pst_id = :pstId",
                        nativeQuery = true)
        int increaseInqCntAtomic(@Param("pstId") String pstId, @Param("delta") int delta);

        // [V2_12 결속] 사용자 삭제 시 게시글 저자를 시스템 계정으로 재귀속 — 콘텐츠 보존 정책
        // (fk_tb_bbs_item_tb_user_info NO ACTION 하에서 저자 행 삭제 전 필수)
        @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
        @Query("UPDATE Board b SET b.userId = :newUserId WHERE b.userId IN :userIds")
        int reassignAuthorByUserIdIn(@Param("userIds") java.util.List<String> userIds,
                        @Param("newUserId") String newUserId);
}
