package nuri.business.domain.comment;

import com.querydsl.core.types.Expression;
import com.querydsl.core.types.dsl.BooleanExpression;

public class CommentPredicate {

    public static BooleanExpression bbsIdAndPstIdEq(Expression<String> bbsId, Expression<Long> pstId) {
        return QComment.comment.bbsId.eq(bbsId)
                .and(QComment.comment.pstId.eq(pstId));
    }

    public static BooleanExpression bbsIdAndPstIdEq(String bbsId, Long pstId) {
        return QComment.comment.bbsId.eq(bbsId)
                .and(QComment.comment.pstId.eq(pstId));
    }

    public static BooleanExpression bbsIdEq(String bbsId) {
        return QComment.comment.bbsId.eq(bbsId);
    }

    public static BooleanExpression pstIdEq(Long pstId) {
        return QComment.comment.pstId.eq(pstId);
    }
}
