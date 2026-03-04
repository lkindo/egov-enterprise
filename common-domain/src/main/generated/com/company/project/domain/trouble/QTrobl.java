package com.company.project.domain.trouble;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QTrobl is a Querydsl query type for Trobl
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QTrobl extends EntityPathBase<Trobl> {

    private static final long serialVersionUID = -1531888883L;

    public static final QTrobl trobl = new QTrobl("trobl");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath processSttus = createString("processSttus");

    public final StringPath troblDc = createString("troblDc");

    public final StringPath troblId = createString("troblId");

    public final StringPath troblKnd = createString("troblKnd");

    public final StringPath troblNm = createString("troblNm");

    public final StringPath troblOccrrncTime = createString("troblOccrrncTime");

    public final StringPath troblOpetrNm = createString("troblOpetrNm");

    public final StringPath troblProcessResult = createString("troblProcessResult");

    public final StringPath troblProcessTime = createString("troblProcessTime");

    public final StringPath troblRequstTime = createString("troblRequstTime");

    public final StringPath troblRqesterNm = createString("troblRqesterNm");

    public QTrobl(String variable) {
        super(Trobl.class, forVariable(variable));
    }

    public QTrobl(Path<? extends Trobl> path) {
        super(path.getType(), path.getMetadata());
    }

    public QTrobl(PathMetadata metadata) {
        super(Trobl.class, metadata);
    }

}
