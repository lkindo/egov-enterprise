package nuri.business.domain.board;

import org.springframework.lang.NonNull;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface BoardRepository extends JpaRepository<Board, Long>, BoardRepositoryCustom {
        @Override
        @NonNull
        Optional<Board> findById(@NonNull Long id);

        @Override
        @Transactional
        void deleteById(@NonNull Long id);

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

        @Query("SELECT b FROM Board b WHERE b.pstSn = :pstSn")
        Optional<Board> findByPstSn(@Param("pstSn") Long pstSn);

        long countByBbsIdAndUseYn(String bbsId, String useYn);

        /**
         * 날짜별 게시글 등록 건수.
         *
         * <p>[2026-08-28] 게시물 통계 화면이 읽던 {@code getBbsStatsByDate} 는 실제로는
         * {@code dtaUseStatsRepository.countByDate} 를 불러 <b>자료이용현황과 완전히 같은 응답</b>을
         *돌려주고 있었다. 게시글을 하나도 세지 않았다는 뜻이다.
         *
         * <p>⚠ {@code use_yn = 'Y'} 를 <b>명시</b>한다. {@code Board} 의 삭제는 논리 삭제
         * ({@code delete()} 가 useYn 을 'N' 으로 바꾼다)이고, 이 네이티브 질의에는 JPA
         * {@code @Filter} 가 걸리지 않는다. 빠뜨리면 <b>지운 글이 통계를 부풀린다.</b>
         */
        @Query(value = """
                        SELECT TO_CHAR(b.crt_dt, 'YYYY-MM-DD') AS statsDate, COUNT(*) AS cnt
                        FROM tb_bbs_item b
                        WHERE b.use_yn = 'Y'
                          AND b.crt_dt BETWEEN CAST(:fromDate AS TIMESTAMP) AND CAST(:toDate AS TIMESTAMP)
                        GROUP BY TO_CHAR(b.crt_dt, 'YYYY-MM-DD')
                        ORDER BY statsDate DESC
                        """, nativeQuery = true)
        List<Object[]> countPostsByDate(
                        @Param("fromDate") String fromDate,
                        @Param("toDate") String toDate);

        @Query("SELECT COUNT(b) FROM Board b WHERE b.bbsId = :bbsId")
        long countAllByBbsId(@Param("bbsId") String bbsId);

        /**
         * 영구 삭제를 막아야 하는 게시글 보유 게시판 ID를 한 번에 조회한다.
         *
         * <p>물리 FK가 보는 전체 행과 같은 집합을 봐야 하므로 native query를 사용해
         * {@code softDeleteFilter}를 우회한다. 숨김 게시글도 남아 있으면 마스터 물리 삭제는 안전하지 않다.
         */
        @Query(value = "SELECT DISTINCT bbs_id FROM tb_bbs_item WHERE bbs_id IN (:bbsIds)", nativeQuery = true)
        List<String> findBbsIdsHavingAnyArticles(@Param("bbsIds") List<String> bbsIds);

        @Query("SELECT COALESCE(SUM(b.inqCnt), 0L) FROM Board b WHERE b.bbsId = :bbsId AND b.useYn = :useYn")
        long sumInqCntByBbsIdAndUseYn(@Param("bbsId") String bbsId, @Param("useYn") String useYn);

        @Query("SELECT b.userNm FROM Board b WHERE b.bbsId = :bbsId AND b.useYn = :useYn GROUP BY b.userNm ORDER BY COUNT(b) DESC LIMIT 1")
        String findTopContributorByBbsIdAndUseYn(@Param("bbsId") String bbsId, @Param("useYn") String useYn);

        @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
        @Query("SELECT b FROM Board b WHERE b.pstSn = :pstSn")
        Optional<Board> findByPstSnWithPessimisticLock(@Param("pstSn") Long pstSn);

        /**
         * 좋아요 수 원자 증가. [W1-17 배선 완료]
         *
         * <p>종전 경로({@code Board.increaseLikeCnt()})는 엔티티를 읽어 필드를 증가시키는
         * <b>비원자 read-modify-write</b> 라 동시 요청에서 증가분이 유실됐다.
         *
         * <p>네이티브인 이유는 아래 {@link #increaseInqCntAtomic} 과 같다 — {@code version} 컬럼을
         * 건드리지 않아 편집자의 낙관적 락을 오염시키지 않는다.
         * {@code clearAutomatically} 로 1차 캐시의 스테일 엔티티를 비워, 갱신 후 재조회가 실제 값을 읽게 한다.
         *
         * <p><b>{@code use_yn = 'Y'} 조건이 있는 이유.</b> 네이티브 쿼리는 Hibernate 의
         * {@code softDeleteFilter} 를 통과하지 않는다(같은 파일 상단 주석 참조). 조건이 없으면
         * <b>숨김 처리된 글에도 좋아요가 올라가고</b>, 종전 경로(엔티티 로드 → 증가)가 지키던
         * "없는 글이면 404" 계약이 조용히 깨진다. 조건을 쿼리에 두면 {@code affected == 0} 이
         * 그대로 404 판정 재료가 되어 원자성과 계약이 <b>한 번의 왕복</b>으로 함께 성립한다.
         * (조회수 {@link #increaseInqCntAtomic} 는 숨김 글 집계가 무해하므로 조건을 두지 않는다 —
         * 두 메서드의 차이는 의도한 것이다.)
         */
        @org.springframework.transaction.annotation.Transactional
        @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
        @Query(value = "UPDATE tb_bbs_item SET like_cnt = COALESCE(like_cnt, 0) + 1 "
                        + "WHERE pst_sn = :pstSn AND use_yn = 'Y'",
                        nativeQuery = true)
        int incrementLikeCntAtomic(@Param("pstSn") Long pstSn);

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
        @Query(value = "UPDATE tb_bbs_item SET inq_cnt = COALESCE(inq_cnt, 0) + :delta WHERE pst_sn = :pstSn",
                        nativeQuery = true)
        int increaseInqCntAtomic(@Param("pstSn") Long pstSn, @Param("delta") int delta);

        /**
         * 댓글 수 변화량을 board 소유 행에서 원자적으로 반영한다. [W1-D5]
         *
         * <p>단일 {@code UPDATE ... SET cmnt_cnt = GREATEST(...)} 이므로 동시 {@code +1/-1}의
         * read-modify-write 유실이 없다. 하한 0은 중복 삭제나 방어적 감소가 음수 통계를 만들지 않게
         * 한다. nullable 레거시 행은 {@code COALESCE}로 0에서 시작한다.
         *
         * <p>네이티브 벌크 UPDATE 는 감사 컬럼과 {@code version}을 건드리지 않는다. 따라서 비동기
         * 리스너의 SYSTEM 감사값 덮어쓰기와 게시글 편집의 낙관적 락 위양성도 만들지 않는다.
         *
         * <p><b>롤아웃 baseline:</b> delta는 배포 전에 이미 어긋난 절대값을 복구하지 못하므로
         * Flyway V2_87이 {@code cmnt_cnt}를 실제 활성 댓글 수로 일회성 정합한다. 그 뒤 런타임은
         * 이 경계를 지키기 위해 댓글 저장소를 다시 세지 않고 단건 변화량만 반영한다.
         *
         * @return 영향 행 수. 등록({@code +1})은 활성 게시글만, 삭제({@code -1})는 게시글의
         *         논리 삭제와 경합해도 물리 키가 일치하면 반영한다.
         */
        @org.springframework.transaction.annotation.Transactional
        @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true, flushAutomatically = true)
        @Query(value = """
                        UPDATE tb_bbs_item
                        SET cmnt_cnt = GREATEST(COALESCE(cmnt_cnt, 0) + :delta, 0)
                        WHERE bbs_id = :bbsId
                          AND pst_sn = :pstSn
                          AND (use_yn = 'Y' OR :delta < 0)
                        """, nativeQuery = true)
        int adjustCmntCntAtomic(
                        @Param("bbsId") String bbsId,
                        @Param("pstSn") Long pstSn,
                        @Param("delta") int delta);

        // [V2_12 결속] 사용자 삭제 시 게시글 저자를 시스템 계정으로 재귀속 — 콘텐츠 보존 정책
        // (fk_tb_bbs_item_tb_user_info NO ACTION 하에서 저자 행 삭제 전 필수)
        @org.springframework.data.jpa.repository.Modifying(clearAutomatically = true)
        @Query("UPDATE Board b SET b.userId = :newUserId WHERE b.userId IN :userIds")
        int reassignAuthorByUserIdIn(@Param("userIds") java.util.List<String> userIds,
                        @Param("newUserId") String newUserId);
}
