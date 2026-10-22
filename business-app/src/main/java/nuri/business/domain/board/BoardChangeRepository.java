package nuri.business.domain.board;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/** 게시판 변경 이력 저장소(V2_139, ADR-0040 결정 9). 한 게시판의 이력을 최신순으로만 읽는다. */
public interface BoardChangeRepository extends JpaRepository<BoardChange, Long> {

    /** 한 게시판의 모든 이력(게시판 행과 게시글 행). */
    Page<BoardChange> findByBbsIdOrderByCrtDtDescBbsChgHstrySnDesc(String bbsId, Pageable pageable);

    /** 한 게시판의 한 대상 유형 이력 — 게시물 조회 대행 권한이 없으면 게시판 행(BBS)만 읽는다. */
    Page<BoardChange> findByBbsIdAndChgTrgtTypeCdOrderByCrtDtDescBbsChgHstrySnDesc(
            String bbsId, String chgTrgtTypeCd, Pageable pageable);
}
