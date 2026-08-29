package nuri.business.domain.board;

import nuri.business.domain.code.QCommonCode;
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
import static nuri.business.domain.template.QTemplate.template;
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
                builder.and(commonCodeTy.dtlCdNm.contains(condition.getSearchWrd()));
            }
        }

        if (StringUtils.hasText(condition.getTrgtId())) {
            builder.and(boardUse.trgtId.eq(condition.getTrgtId()));
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
                boardMaster.bbsTypeCd,
                commonCodeTy.dtlCdNm.as("bbsTypeCdNm"),
                boardMaster.bbsAtrbCd,
                commonCodeAttr.dtlCdNm.as("bbsAtrbCdNm"),
                boardMaster.bbsTtl,
                boardMaster.tmpltId,
                boardMaster.useYn,
                boardMaster.crtDt.as("crtDt")))
                .from(boardMaster)
                .leftJoin(commonCodeTy)
                .on(boardMaster.bbsTypeCd.eq(commonCodeTy.dtlCd).and(commonCodeTy.cdId.eq("COM004")))
                .leftJoin(commonCodeAttr)
                .on(boardMaster.bbsAtrbCd.eq(commonCodeAttr.dtlCd).and(commonCodeAttr.cdId.eq("COM009")));

        if (StringUtils.hasText(condition.getTrgtId())) {
            query.join(boardUse).on(boardMaster.bbsId.eq(boardUse.bbsId));
        }

        List<BoardMasterSearchResult> results = query
                .where(builder)
                .orderBy(boardMaster.crtDt.desc())
                .offset(pageable.getOffset())
                .limit(pageable.getPageSize())
                .fetch();

        Long totalResult = queryFactory.select(Wildcard.count)
                .from(boardMaster)
                .leftJoin(commonCodeTy)
                .on(boardMaster.bbsTypeCd.eq(commonCodeTy.dtlCd).and(commonCodeTy.cdId.eq("COM004")))
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
                boardMaster.bbsTypeCd,
                commonCodeTy.dtlCdNm.as("bbsTypeCdNm"),
                boardMaster.bbsExpln,
                boardMaster.bbsAtrbCd,
                commonCodeAttr.dtlCdNm.as("bbsAtrbCdNm"),
                boardMaster.bbsTtl,
                boardMaster.tmpltId,
                template.tmpltNm.as("tmplatNm"),
                template.tmpltPath.as("tmplatCours"),
                boardMaster.fileAtchPsbltyYn,
                boardMaster.atchPsbltyFileQty,
                boardMaster.atchPsbltyFileSz,
                boardMaster.ansPsbltyYn,
                boardMaster.frstRgtrId.as("frstRgtrId"),
                boardMaster.useYn,
                boardMaster.crtDt.as("crtDt")))
                .from(boardMaster)
                .leftJoin(commonCodeTy)
                .on(boardMaster.bbsTypeCd.eq(commonCodeTy.dtlCd).and(commonCodeTy.cdId.eq("COM004")))
                .leftJoin(commonCodeAttr)
                .on(boardMaster.bbsAtrbCd.eq(commonCodeAttr.dtlCd).and(commonCodeAttr.cdId.eq("COM009")))
                .leftJoin(template).on(boardMaster.tmpltId.eq(template.tmpltId))
                .where(boardMaster.bbsId.eq(bbsId))
                .fetchOne();

        if (result != null && StringUtils.hasText(uniqId)) {
            String authFlag = queryFactory.select(boardUse.useYn)
                    .from(boardUse)
                    .where(boardUse.bbsId.eq(bbsId)
                            .and(boardUse.trgtId.in(uniqId, "SYSTEM_DEFAULT_BOARD")))
                    .fetchFirst();
            result.setAuthFlag(authFlag != null ? authFlag : "N");
        }

        return Optional.ofNullable(result);
    }
}
