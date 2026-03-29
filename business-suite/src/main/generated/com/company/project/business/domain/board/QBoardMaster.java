package com.company.project.business.domain.board;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QBoardMaster is a Querydsl query type for BoardMaster
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBoardMaster extends EntityPathBase<BoardMaster> {

    private static final long serialVersionUID = 695793809L;

    public static final QBoardMaster boardMaster = new QBoardMaster("boardMaster");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final NumberPath<Integer> atchPosblFileNumber = createNumber("atchPosblFileNumber", Integer.class);

    public final NumberPath<Long> atchPosblFileSize = createNumber("atchPosblFileSize", Long.class);

    public final StringPath bbsAttrbCode = createString("bbsAttrbCode");

    public final StringPath bbsId = createString("bbsId");

    public final StringPath bbsIntrcn = createString("bbsIntrcn");

    public final StringPath bbsNm = createString("bbsNm");

    public final StringPath bbsTyCode = createString("bbsTyCode");

    public final StringPath blogAt = createString("blogAt");

    public final StringPath blogId = createString("blogId");

    public final StringPath cmmntyId = createString("cmmntyId");

    public final StringPath commentAt = createString("commentAt");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath fileAtchPosblAt = createString("fileAtchPosblAt");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath optnFrstRegisterId = createString("optnFrstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> optnFrstRegistPnttm = createDateTime("optnFrstRegistPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> optnLastUpdtPnttm = createDateTime("optnLastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath optnLastUpdusrId = createString("optnLastUpdusrId");

    public final StringPath replyPosblAt = createString("replyPosblAt");

    public final StringPath stsfdgAt = createString("stsfdgAt");

    public final StringPath tmplatId = createString("tmplatId");

    public final StringPath useAt = createString("useAt");

    public QBoardMaster(String variable) {
        super(BoardMaster.class, forVariable(variable));
    }

    public QBoardMaster(Path<? extends BoardMaster> path) {
        super(path.getType(), path.getMetadata());
    }

    public QBoardMaster(PathMetadata metadata) {
        super(BoardMaster.class, metadata);
    }

}

