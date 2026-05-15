package nuri.business.domain.board;

import nuri.foundation.domain.code.QCommonCode;
import com.querydsl.core.BooleanBuilder;
import com.querydsl.core.types.Projections;
import com.querydsl.core.types.dsl.Wildcard;
import com.querydsl.jpa.impl.JPAQuery;
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
import static nuri.business.domain.board.QBoardMaster.boardMaster;
import static nuri.business.domain.board.QTemplate.template;
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
        QCommonCode commonCodeTy = new QCommonCode("commonCodeTy");
        QCommonCode commonCodeAttr = new QCommonCode("commonCodeAttr");

        BooleanBuilder builder = new BooleanBuilder();
        if (StringUtils.hasText(condition.getUseYn())) {
            builder.and(boardMaster.useYn.eq(condition.getUseYn()));
        }

        if (StringUtils.hasText(condition.getSearchWrd())) {
            if ("0".equals(condition.getSearchCnd())) {
                builder.and(boardMaster.bbsTtl.contains(condition.getSearchWrd()));
            } else if ("1".equals(condition.getSearchCnd())) {
                builder.and(commonCodeTy.codeNm.contains(condition.getSearchWrd()));
            }
        }

        if (StringUtils.hasText(condition.getTrgetId())) {
            builder.and(boardUse.trgetId.eq(condition.getTrgetId()));
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
                boardMaster.bbsTypeCd.as("bbsTypeCd"),
                commonCodeTy.codeNm.as("bbsTypeCdNm"),
                boardMaster.bbsAttrCd.as("bbsAttrCd"),
                commonCodeAttr.codeNm.as("bbsAttrCdNm"),
                boardMaster.bbsTtl.as("bbsTtl"),
                boardMaster.tmplatId,
                boardMaster.useYn,
                boardMaster.createdDate))
                .from(boardMaster)
                .leftJoin(commonCodeTy)
                .on(boardMaster.bbsTypeCd.eq(commonCodeTy.code).and(commonCodeTy.codeGroupId.eq("COM004")))
                .leftJoin(commonCodeAttr)
                .on(boardMaster.bbsAttrCd.eq(commonCodeAttr.code).and(commonCodeAttr.codeGroupId.eq("COM009")));

        if (StringUtils.hasText(condition.getTrgetId())) {
            query.join(boardUse).on(boardMaster.bbsId.eq(boardUse.bbsId));
        }

        List<BoardMasterSearchResult> results = query
                .where(builder)
                .orderBy(boardMaster.createdDate.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long totalResult = queryFactory.select(Wildcard.count)
                .from(boardMaster)
                .leftJoin(commonCodeTy)
                .on(boardMaster.bbsTypeCd.eq(commonCodeTy.code).and(commonCodeTy.codeGroupId.eq("COM004")))
                .where(builder)
                .fetchOne();
        long total = totalResult != null ? totalResult : 0L;

        return new PageImpl<>(Objects.requireNonNull(results), Objects.requireNonNull(pageable), total);
    }

    @Override
    public Optional<BoardMasterDetailResult> findBoardMasterDetail(@NonNull String bbsId, String uniqId) {
        QCommonCode commonCodeTy = new QCommonCode("commonCodeTy");
        QCommonCode commonCodeAttr = new QCommonCode("commonCodeAttr");

        BoardMasterDetailResult result = queryFactory.select(Projections.fields(BoardMasterDetailResult.class,
                boardMaster.bbsId,
                boardMaster.bbsTypeCd.as("bbsTypeCd"),
                commonCodeTy.codeNm.as("bbsTypeCdNm"),
                boardMaster.bbsIntroCn.as("bbsIntroCn"),
                boardMaster.bbsAttrCd.as("bbsAttrCd"),
                commonCodeAttr.codeNm.as("bbsAttrCdNm"),
                boardMaster.bbsTtl.as("bbsTtl"),
                boardMaster.tmplatId,
                template.tmplatNm,
                template.tmplatCours,
                boardMaster.fileAtchPsblYn.as("fileAtchPsblYn"),
                boardMaster.atchPsblFileCnt.as("atchPsblFileCnt"),
                boardMaster.atchPsblFileSize.as("atchPsblFileSize"),
                boardMaster.replyPsblYn.as("replyPsblYn"),
                boardMaster.createdBy.as("frstRegisterId"),
                boardMaster.useYn,
                boardMaster.createdDate))
                .from(boardMaster)
                .leftJoin(commonCodeTy)
                .on(boardMaster.bbsTypeCd.eq(commonCodeTy.code).and(commonCodeTy.codeGroupId.eq("COM004")))
                .leftJoin(commonCodeAttr)
                .on(boardMaster.bbsAttrCd.eq(commonCodeAttr.code).and(commonCodeAttr.codeGroupId.eq("COM009")))
                .leftJoin(template).on(boardMaster.tmplatId.eq(template.tmplatId))
                .where(boardMaster.bbsId.eq(bbsId))
                .fetchOne();

        if (result != null && StringUtils.hasText(uniqId)) {
            String authFlag = queryFactory.select(boardUse.useYn)
                    .from(boardUse)
                    .where(boardUse.bbsId.eq(bbsId)
                            .and(boardUse.trgetId.in(uniqId, "SYSTEM_DEFAULT_BOARD")))
                    .fetchFirst();
            result.setAuthFlag(authFlag != null ? authFlag : "N");
        }

        return Optional.ofNullable(result);
    }
}
