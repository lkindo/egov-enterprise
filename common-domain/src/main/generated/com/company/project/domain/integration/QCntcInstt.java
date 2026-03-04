package com.company.project.domain.integration;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QCntcInstt is a Querydsl query type for CntcInstt
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QCntcInstt extends EntityPathBase<CntcInstt> {

    private static final long serialVersionUID = 1240546915L;

    public static final QCntcInstt cntcInstt = new QCntcInstt("cntcInstt");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath insttId = createString("insttId");

    public final StringPath insttNm = createString("insttNm");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath useAt = createString("useAt");

    public QCntcInstt(String variable) {
        super(CntcInstt.class, forVariable(variable));
    }

    public QCntcInstt(Path<? extends CntcInstt> path) {
        super(path.getType(), path.getMetadata());
    }

    public QCntcInstt(PathMetadata metadata) {
        super(CntcInstt.class, metadata);
    }

}
