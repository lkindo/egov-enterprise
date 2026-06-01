package nuri.business.domain.comment;

import com.querydsl.core.types.dsl.BooleanExpression;

public class CommentPredicate {

    public static BooleanExpression searchComment(String bbsId, String pstId) {
        return QComment.comment.bbsId.eq(bbsId)
                .and(QComment.comment.pstId.eq(pstId));
    }

    public static BooleanExpression searchArticleComment(String bbsId, String pstId) {
        return QComment.comment.bbsId.eq(bbsId)
                .and(QComment.comment.pstId.eq(pstId));
    }

    public static BooleanExpression bbsIdEq(String bbsId) {
        return QComment.comment.bbsId.eq(bbsId);
    }

    public static BooleanExpression pstIdEq(String pstId) {
        return QComment.comment.pstId.eq(pstId);
    }

    public static BooleanExpression bbsIdAndPstIdEq(String bbsId, String pstId) { return searchComment(bbsId, pstId); }
    public static BooleanExpression bbsIdAndPstIdEq(com.querydsl.core.types.dsl.StringExpression bbsId, com.querydsl.core.types.dsl.StringPath pstId) {
        return QComment.comment.bbsId.eq(bbsId).and(QComment.comment.pstId.eq(pstId));
    }
}
