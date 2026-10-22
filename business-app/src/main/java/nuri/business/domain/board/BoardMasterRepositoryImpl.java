package nuri.business.domain.board;

import nuri.business.domain.code.QCommonCode;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.Wildcard;
import com.querydsl.jpa.impl.JPAQuery;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.jspecify.annotations.NonNull;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import static nuri.business.domain.board.QBoardMaster.boardMaster;
import static nuri.business.domain.board.QBoardUse.boardUse;
import com.querydsl.jpa.JPAExpressions;

public class BoardMasterRepositoryImpl implements BoardMasterRepositoryCustom {

    private final JPAQueryFactory queryFactory;

    public BoardMasterRepositoryImpl(EntityManager em) {
        this.queryFactory = new JPAQueryFactory(em);
    }

    @Override
    public Page<BoardMasterSearchResult> searchBoardMasters(BoardMasterSearchCondition condition,
            @NonNull Pageable pageable) {
        QCommonCode commonCodeAttr = new QCommonCode("commonCodeAttr");

        BooleanBuilder builder = new BooleanBuilder();
        if (StringUtils.hasText(condition.getUseYn())) {
            builder.and(boardMaster.useYn.eq(condition.getUseYn()));
        }

        /*
         * [2026-10-16 GAP-BOARD-002, DEC-OPS-332] 검색 축은 게시판명 하나다.
         * 종전에는 searchCnd '0' 이면 게시판명, '1' 이면 공통코드 COM004 의 유형 이름으로 걸렀다. 그런데 COM004 는
         * 원본·공유 DB 어디에도 없어 유형 이름은 늘 비었고('1' 은 늘 0건), 화면은 searchCnd 를 보내지 않아 검색어가
         * 아예 무시됐다. 유형 이름의 정본은 이제 화면 상수(frontend/src/lib/board/board-types.ts)라 서버는 코드만 다룬다.
         */
        if (StringUtils.hasText(condition.getSearchWrd())) {
            builder.and(boardMaster.bbsTtl.contains(condition.getSearchWrd()));
        }

        if (StringUtils.hasText(condition.getTrgtId())) {
            builder.and(boardUse.trgtId.eq(condition.getTrgtId()));
            builder.and(boardUse.useYn.eq("Y"));
        }

        if (condition.isNotUsedOnly()) {
            builder.and(boardMaster.bbsId.notIn(
                    JPAExpressions.select(boardUse.bbsId)
                            .from(boardUse)
                            .where(boardUse.useYn.eq("Y"))));
        }

        JPAQuery<BoardMasterSearchResult> query = queryFactory.select(Projections.fields(BoardMasterSearchResult.class,
                boardMaster.bbsId,
                boardMaster.bbsTypeCd,
                boardMaster.bbsAtrbCd,
                commonCodeAttr.dtlCdNm.as("bbsAtrbCdNm"),
                boardMaster.bbsTtl,
                boardMaster.tmpltId,
                boardMaster.useYn,
                boardMaster.crtDt.as("crtDt")))
                .from(boardMaster)
                .leftJoin(commonCodeAttr)
                .on(boardMaster.bbsAtrbCd.eq(commonCodeAttr.dtlCd).and(commonCodeAttr.cdId.eq("COM009")));

        if (StringUtils.hasText(condition.getTrgtId())) {
            query.join(boardUse).on(boardMaster.bbsId.eq(boardUse.bbsId));
        }

        List<BoardMasterSearchResult> results = query
                .where(builder)
                .orderBy(boardMaster.crtDt.desc(), boardMaster.bbsId.asc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long totalResult = queryFactory.select(Wildcard.count)
                .from(boardMaster)
                .where(builder)
                .fetchOne();
        long total = totalResult != null ? totalResult : 0L;

        return new PageImpl<>(Objects.requireNonNull(results), Objects.requireNonNull(pageable), total);
    }

    @Override
    public List<BoardOptionRow> findActiveBoardOptions() {
        return queryFactory.select(Projections.constructor(BoardOptionRow.class,
                        boardMaster.bbsId, boardMaster.bbsTtl, boardMaster.cmntySn))
                .from(boardMaster)
                .where(boardMaster.useYn.eq("Y"))
                .orderBy(boardMaster.crtDt.desc(), boardMaster.bbsId.asc())
                .fetch();
    }
}
