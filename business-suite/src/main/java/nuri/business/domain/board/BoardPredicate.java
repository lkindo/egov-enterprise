package nuri.business.domain.board;

import lombok.extern.slf4j.Slf4j;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.dsl.BooleanExpression;
import org.springframework.util.StringUtils;

@Slf4j
public class BoardPredicate {

    public static BooleanBuilder searchBoard(BoardSearchCondition condition) {
        BooleanBuilder builder = new BooleanBuilder();

        if (condition.getSearchWrd() != null) {
            String wrd = condition.getSearchWrd();
            StringBuilder hex = new StringBuilder();
            for (byte b : wrd.getBytes(java.nio.charset.StandardCharsets.UTF_8)) {
                hex.append(String.format("%02X ", b));
            }
            log.debug("DEBUG: BoardSearchCondition - searchCnd: {}, searchWrd: [{}], Hex(UTF-8): {}", 
                               condition.getSearchCnd(), wrd, hex.toString());
        }
        
        if (StringUtils.hasText(condition.getBbsId())) {
            builder.and(bbsIdEq(condition.getBbsId()));
        }

        if (StringUtils.hasText(condition.getSearchWrd())) {
            String searchWrd = condition.getSearchWrd();
            if ("0".equals(condition.getSearchCnd())) { // Title
                builder.and(pstTtlContains(searchWrd));
            } else if ("1".equals(condition.getSearchCnd())) { // Content
                builder.and(pstCnContains(searchWrd));
            } else if ("2".equals(condition.getSearchCnd())) { // Writer
                builder.and(userNmContains(searchWrd));
            }
        }

        if (condition.getStartDate() != null) {
            builder.and(QBoard.board.crtDt.goe(condition.getStartDate()));
        }

        if (condition.getEndDate() != null) {
            builder.and(QBoard.board.crtDt.loe(condition.getEndDate()));
        }

        if (StringUtils.hasText(condition.getQnaStatus())) {
            builder.and(QBoard.board.qnaSttsCd.eq(condition.getQnaStatus()));
        }

        if (StringUtils.hasText(condition.getQnaCategory())) {
            builder.and(QBoard.board.qnaCatCd.eq(condition.getQnaCategory()));
        }

        return builder;
    }

    public static BooleanExpression bbsIdEq(String bbsId) {
        return QBoard.board.bbsId.eq(bbsId);
    }

    public static BooleanExpression pstTtlContains(String pstTtl) {
        return QBoard.board.pstTtl.contains(pstTtl);
    }

    public static BooleanExpression pstCnContains(String pstCn) {
        return QBoard.board.pstCn.contains(pstCn);
    }

    public static BooleanExpression userNmContains(String userNm) {
        return QBoard.board.userNm.contains(userNm);
    }
}
