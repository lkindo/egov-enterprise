package nuri.business.domain.comment;

import com.querydsl.core.types.Expression;
import com.querydsl.core.types.dsl.BooleanExpression;

public class CommentPredicate {

    public static BooleanExpression bbsIdAndNttIdEq(Expression<String> bbsId, Expression<Long> nttId) {
        return QComment.comment.bbsId.eq(bbsId)
                .and(QComment.comment.nttId.eq(nttId));
    }

    public static BooleanExpression bbsIdAndNttIdEq(String bbsId, Long nttId) {
        return QComment.comment.bbsId.eq(bbsId)
                .and(QComment.comment.nttId.eq(nttId));
    }

    public static BooleanExpression bbsIdEq(String bbsId) {
        return QComment.comment.bbsId.eq(bbsId);
    }

    public static BooleanExpression nttIdEq(Long nttId) {
        return QComment.comment.nttId.eq(nttId);
    }
}
