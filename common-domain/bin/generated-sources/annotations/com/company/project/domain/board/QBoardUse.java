package com.company.project.domain.board;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QBoardUse is a Querydsl query type for BoardUse
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBoardUse extends EntityPathBase<BoardUse> {

    private static final long serialVersionUID = 1791327200L;

    public static final QBoardUse boardUse = new QBoardUse("boardUse");

    public final com.company.project.domain.common.QBaseTimeEntity _super = new com.company.project.domain.common.QBaseTimeEntity(this);

    public final StringPath bbsId = createString("bbsId");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath registSeCode = createString("registSeCode");

    public final StringPath trgetId = createString("trgetId");

    public final StringPath useAt = createString("useAt");

    public QBoardUse(String variable) {
        super(BoardUse.class, forVariable(variable));
    }

    public QBoardUse(Path<? extends BoardUse> path) {
        super(path.getType(), path.getMetadata());
    }

    public QBoardUse(PathMetadata metadata) {
        super(BoardUse.class, metadata);
    }

}

