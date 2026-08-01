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
import java.util.Optional;
import nuri.business.domain.user.entity.QUser;

public class BoardRepositoryImpl implements BoardRepositoryCustom {

        private final JPAQueryFactory queryFactory;

        public BoardRepositoryImpl(EntityManager em) {
                this.queryFactory = new JPAQueryFactory(em);
        }

        @Override
        public Optional<BoardDetailResult> findArticleDetail(@NonNull String pstId) {
                BoardDetailResult result = queryFactory
                                .select(Projections.fields(BoardDetailResult.class,
                                                 QBoardMaster.boardMaster.bbsId,
                                                 QBoard.board.pstId,
                                                 QBoard.board.pstTtl,
                                                 QBoard.board.userId,
                                                 QBoard.board.ansSn,
                                                 QBoard.board.pstCn,
                                                 QBoard.board.pswd,
                                                 QBoard.board.frstRgtrId.as("frstRgtrId"),
                                                 QUser.user.userNm.coalesce(QBoard.board.userNm).as("userNm"),
                                                 QBoard.board.crtDt.as("crtDt"),
                                                 QBoard.board.pstBgngYmd,
                                                 QBoard.board.pstEndYmd,
                                                 QBoard.board.inqCnt,
                                                 QBoard.board.likeCnt,
                                                 QBoard.board.useYn,
                                                 QBoard.board.atchFileId,
                                                 QBoard.board.upPstId,
                                                 QBoard.board.sortOrdr,
                                                 QBoard.board.ttlBoldYn,
                                                 QBoard.board.scrtYn,
                                                 QBoard.board.evntDt,
                                                 QBoard.board.qnaSttsCd,
                                                 QBoard.board.qnaCatCd,
                                                 QBoardMaster.boardMaster.bbsTypeCd.as("bbsTypeCd"),
                                                 QBoardMaster.boardMaster.ansPsbltyYn.as("ansPsbltyYn"),
                                                 QBoardMaster.boardMaster.fileAtchPsbltyYn.as("fileAtchPsbltyYn"),
                                                 QBoardMaster.boardMaster.atchPsbltyFileQty.as("atchPsbltyFileQty"),
                                                 QBoardMaster.boardMaster.bbsTtl.as("bbsTtl")))
                                .from(QBoard.board)
                                .leftJoin(QUser.user).on(QBoard.board.frstRgtrId.eq(QUser.user.esntlId))
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
                                        orderSpecifier = QBoard.board.inqCnt.desc();
                                        break;
 
                                case "date":
                                        orderSpecifier = QBoard.board.crtDt.desc();        
                                        break;
                        }
                }
 
                List<BoardSearchResult> results = queryFactory
                                .select(Projections.fields(BoardSearchResult.class,
                                                 QBoard.board.pstId,
                                                 QBoard.board.bbsId,
                                                 QBoard.board.pstTtl,
                                                 QBoard.board.userNm,
                                                 QBoard.board.crtDt.as("crtDt"),
                                                 QBoard.board.inqCnt,
                                                 QBoard.board.likeCnt,
                                                 QBoard.board.upPstId,
                                                 QBoard.board.sortOrdr,
                                                 QBoard.board.ansSn,
                                                 QBoard.board.scrtYn,
                                                 QBoard.board.evntDt,
                                                 QBoard.board.qnaSttsCd,
                                                 QBoard.board.qnaCatCd))
                                .from(QBoard.board)
                                // [W1-25 P3④] 사용하지 않는 leftJoin(QUser) 제거 — 가장 뜨거운 목록 쿼리가
                                //   content/count 양쪽에서 tb_user_info 를 조인하고 있었으나 셀렉트(86-100행)는
                                //   전부 QBoard.board.*, where(BoardPredicate)도 작성자 검색조차
                                //   QBoard.board.userNm 을 쓰며, orderBy 도 QBoard 전용이라 기여가 0이었다.
                                //   조인 조건의 esntlId 는 User 의 @Id 라 매칭이 최대 1건 → 행 수도 불변이다.
                                .where(builder)
                                .orderBy(orderSpecifier, QBoard.board.ansSn.asc())
                                .offset(pageable.getOffset())
                                .limit(pageable.getPageSize())
                                .fetch();

                Long total = queryFactory
                                .select(QBoard.board.count())
                                .from(QBoard.board)
                                // [W1-25 P3④] 동일 — count 쿼리는 select 가 count() 하나라 더 명백하다.
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
                                .orderBy(QBoard.board.sortOrdr.desc(), QBoard.board.ansSn.asc()) 
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
        public Optional<Board> findByIdCustom(@NonNull String pstId) {
                Board result = queryFactory
                                .selectFrom(QBoard.board)
                                .where(QBoard.board.pstId.eq(pstId))
                                .fetchOne();

                return Optional.ofNullable(result);
        }
}
