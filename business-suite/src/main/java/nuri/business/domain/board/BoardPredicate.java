package nuri.business.domain.board;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.dsl.BooleanExpression;
import org.springframework.util.StringUtils;

public class BoardPredicate {

    public static BooleanBuilder searchBoard(BoardSearchCondition condition) {
        BooleanBuilder builder = new BooleanBuilder();

        if (condition.getSearchWrd() != null) {
            String wrd = condition.getSearchWrd();
            StringBuilder hex = new StringBuilder();
            for (byte b : wrd.getBytes(java.nio.charset.StandardCharsets.UTF_8)) {
                hex.append(String.format("%02X ", b));
            }
            System.out.println("DEBUG: BoardSearchCondition - searchCnd: " + condition.getSearchCnd() + 
                               ", searchWrd: [" + wrd + "], Hex(UTF-8): " + hex.toString());
        }
        
        if (StringUtils.hasText(condition.getBbsId())) {
            builder.and(bbsIdEq(condition.getBbsId()));
        }

        if (StringUtils.hasText(condition.getSearchWrd())) {
            String searchWrd = condition.getSearchWrd();
            if ("0".equals(condition.getSearchCnd())) { // Title
                builder.and(nttSjContains(searchWrd));
            } else if ("1".equals(condition.getSearchCnd())) { // Content
                builder.and(nttCnContains(searchWrd));
            } else if ("2".equals(condition.getSearchCnd())) { // Writer
                builder.and(ntcrNmContains(searchWrd));
            }
        }

        if (condition.getStartDate() != null) {
            builder.and(QBoard.board.createdDate.goe(condition.getStartDate()));
        }

        if (condition.getEndDate() != null) {
            builder.and(QBoard.board.createdDate.loe(condition.getEndDate()));
        }

        if (StringUtils.hasText(condition.getQnaStatus())) {
            builder.and(QBoard.board.qnaStatus.eq(condition.getQnaStatus()));
        }

        if (StringUtils.hasText(condition.getQnaCategory())) {
            builder.and(QBoard.board.qnaCategory.eq(condition.getQnaCategory()));
        }

        return builder;
    }

    public static BooleanExpression bbsIdEq(String bbsId) {
        return QBoard.board.bbsId.eq(bbsId);
    }

    public static BooleanExpression nttSjContains(String nttSj) {
        return QBoard.board.nttSj.contains(nttSj);
    }

    public static BooleanExpression nttCnContains(String nttCn) {
        return QBoard.board.nttCn.contains(nttCn);
    }

    public static BooleanExpression ntcrNmContains(String ntcrNm) {
        return QBoard.board.ntcrNm.contains(ntcrNm);
    }
}
