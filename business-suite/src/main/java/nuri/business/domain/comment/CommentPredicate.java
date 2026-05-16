package nuri.business.domain.comment;

import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.dsl.BooleanExpression;
import org.springframework.util.StringUtils;

public class CommentPredicate {

    public static BooleanExpression searchComment(String bbsId, Long nttId) {
        return QComment.comment.bbsId.eq(bbsId)
                .and(QComment.comment.nttId.eq(nttId));
    }

    public static BooleanExpression searchArticleComment(String bbsId, Long nttId) {
        return QComment.comment.bbsId.eq(bbsId)
                .and(QComment.comment.nttId.eq(nttId));
    }

    public static BooleanExpression bbsIdEq(String bbsId) {
        return QComment.comment.bbsId.eq(bbsId);
    }

    public static BooleanExpression nttIdEq(Long nttId) {
        return QComment.comment.nttId.eq(nttId);
    }

    // legacy
    public static BooleanExpression pstIdEq(Long pstId) { return nttIdEq(pstId); }
    public static BooleanExpression bbsIdAndPstIdEq(String bbsId, Long pstId) { return searchComment(bbsId, pstId); }
    public static BooleanExpression bbsIdAndPstIdEq(com.querydsl.core.types.dsl.StringExpression bbsId, com.querydsl.core.types.dsl.NumberExpression<Long> pstId) {
        return QComment.comment.bbsId.eq(bbsId).and(QComment.comment.nttId.eq(pstId));
    }
}
