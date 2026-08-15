package nuri.business.domain.comment;

import com.querydsl.core.types.dsl.BooleanExpression;

public class CommentPredicate {

    public static BooleanExpression searchComment(String bbsId, Long pstSn) {
        return QComment.comment.bbsId.eq(bbsId)
                .and(QComment.comment.pstSn.eq(pstSn));
    }

    public static BooleanExpression searchArticleComment(String bbsId, Long pstSn) {
        return QComment.comment.bbsId.eq(bbsId)
                .and(QComment.comment.pstSn.eq(pstSn));
    }

    public static BooleanExpression bbsIdEq(String bbsId) {
        return QComment.comment.bbsId.eq(bbsId);
    }

    public static BooleanExpression pstSnEq(Long pstSn) {
        return QComment.comment.pstSn.eq(pstSn);
    }

    public static BooleanExpression bbsIdAndPstSnEq(String bbsId, Long pstSn) { return searchComment(bbsId, pstSn); }
    public static BooleanExpression bbsIdAndPstSnEq(com.querydsl.core.types.dsl.StringExpression bbsId,
            com.querydsl.core.types.dsl.NumberPath<Long> pstSn) {
        return QComment.comment.bbsId.eq(bbsId).and(QComment.comment.pstSn.eq(pstSn));
    }
}
