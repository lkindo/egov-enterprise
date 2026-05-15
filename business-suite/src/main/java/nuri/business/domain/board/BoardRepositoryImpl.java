package nuri.business.domain.board;

import com.querydsl.core.types.Projections;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.OrderSpecifier;
import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.lang.NonNull;
import org.springframework.util.StringUtils;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import nuri.foundation.domain.user.entity.QUser;

public class BoardRepositoryImpl implements BoardRepositoryCustom {

        private final JPAQueryFactory queryFactory;

        public BoardRepositoryImpl(EntityManager em) {
                this.queryFactory = new JPAQueryFactory(em);
        }

        @Override
        public Optional<BoardDetailResult> findArticleDetail(@NonNull Long pstId) {
                BoardDetailResult result = queryFactory
                                .select(Projections.fields(BoardDetailResult.class,
                                                QBoardMaster.boardMaster.bbsId,
                                                QBoard.board.pstId,
                                                QBoard.board.pstTtl,
                                                QBoard.board.ntcrId,
                                                QBoard.board.ntcrNm,
                                                QBoard.board.pstSn,
                                                QBoard.board.pstCn,
                                                QBoard.board.password,
                                                QBoard.board.createdBy.as("frstRegisterId"),
                                                QUser.user.userNm.coalesce(QBoard.board.ntcrNm).as("frstRegisterNm"),
                                                QBoard.board.createdDate,
                                                QBoard.board.ntceBgnyYmd,
                                                QBoard.board.ntceEndYmd,
                                                QBoard.board.inqireCo,
                                                QBoard.board.likeCo,
                                                QBoard.board.useYn,
                                                QBoard.board.atchFileId,
                                                QBoard.board.parnts,
                                                QBoard.board.replyYn,
                                                QBoard.board.replyLc,
                                                QBoard.board.sortOrdr,
                                                QBoard.board.sjBoldYn,
                                                QBoard.board.noticeYn,
                                                QBoard.board.secretYn,
                                                QBoard.board.eventDate,
                                                QBoard.board.qnaStatus,
                                                QBoard.board.qnaCategory,
                                                QBoardMaster.boardMaster.bbsTypeCd.as("bbsTypeCd"),
                                                QBoardMaster.boardMaster.replyPsblYn.as("replyPsblYn"),
                                                QBoardMaster.boardMaster.fileAtchPsblYn.as("fileAtchPsblYn"),
                                                QBoardMaster.boardMaster.atchPsblFileCnt.as("atchPsblFileCnt"),
                                                QBoardMaster.boardMaster.bbsTtl.as("bbsTtl")))
                                .from(QBoard.board)
                                .leftJoin(QUser.user).on(QBoard.board.createdBy.eq(QUser.user.esntlId))
                                .leftJoin(QBoardMaster.boardMaster)
                                .on(QBoard.board.bbsId.eq(QBoardMaster.boardMaster.bbsId))
                                .where(QBoard.board.pstId.eq(pstId))
                                .fetchOne();

                return Optional.ofNullable(result);
        }

        @Override
        public Page<BoardSearchResult> searchArticles(BoardSearchCondition condition, @NonNull Pageable pageable) {
                BooleanBuilder builder = BoardPredicate.searchBoard(condition);

                OrderSpecifier<?> orderSpecifier = QBoard.board.sortOrdr.desc();

                if (StringUtils.hasText(condition.getOrderBy())) {
                        switch (condition.getOrderBy()) {
                                case "views":
                                        orderSpecifier = QBoard.board.inqireCo.desc();
                                        break;
                                case "comments":
                                        orderSpecifier = QBoard.board.commentCo.desc(); 
                                        break;
                                case "date":
                                        orderSpecifier = QBoard.board.createdDate.desc();        
                                        break;
                        }
                }

                List<BoardSearchResult> results = queryFactory
                                .select(Projections.fields(BoardSearchResult.class,
                                                QBoard.board.pstId,
                                                QBoard.board.bbsId,
                                                QBoard.board.pstTtl,
                                                QBoard.board.ntcrNm.as("frstRegisterNm"),
                                                QBoard.board.createdDate,
                                                QBoard.board.inqireCo,
                                                QBoard.board.likeCo,
                                                QBoard.board.replyYn,
                                                QBoard.board.parnts,
                                                QBoard.board.replyLc,
                                                QBoard.board.sortOrdr,
                                                QBoard.board.pstSn,
                                                QBoard.board.noticeYn,
                                                QBoard.board.secretYn,
                                                QBoard.board.commentCo,
                                                QBoard.board.eventDate,
                                                QBoard.board.qnaStatus,
                                                QBoard.board.qnaCategory))
                                .from(QBoard.board)
                                .leftJoin(QUser.user).on(QBoard.board.createdBy.eq(QUser.user.esntlId))
                                .where(builder)
                                .orderBy(orderSpecifier, QBoard.board.pstSn.asc())
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .fetch();

                Long total = queryFactory
                                .select(QBoard.board.count())
                                .from(QBoard.board)
                                .leftJoin(QUser.user).on(QBoard.board.createdBy.eq(QUser.user.esntlId))
                                .where(builder)
                                .fetchOne();

                return new PageImpl<>(results, pageable,
                                total != null ? total.longValue() : 0L);
        }

        @Override
        public Page<Board> search(BoardSearchCondition condition, @NonNull Pageable pageable) {  
                BooleanBuilder builder = BoardPredicate.searchBoard(condition);

                List<Board> content = queryFactory
                                .selectFrom(QBoard.board)
                                .where(builder)
                                .orderBy(QBoard.board.sortOrdr.desc(), QBoard.board.pstSn.asc()) 
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .fetch();

                Long totalResult = queryFactory
                                .select(QBoard.board.count())
                                .from(QBoard.board)
                                .where(builder)
                                .fetchOne();

                return new PageImpl<>(content, pageable,
                                totalResult != null ? totalResult : 0L);
        }

        @Override
        public Optional<Board> findByIdCustom(@NonNull Long pstId) {
                Board result = queryFactory
                                .selectFrom(QBoard.board)
                                .where(QBoard.board.pstId.eq(pstId))
                                .fetchOne();

                return Optional.ofNullable(result);
        }
}
