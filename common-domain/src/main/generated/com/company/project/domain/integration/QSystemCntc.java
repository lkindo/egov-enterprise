package com.company.project.domain.integration;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QSystemCntc is a Querydsl query type for SystemCntc
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSystemCntc extends EntityPathBase<SystemCntc> {

    private static final long serialVersionUID = -490022566L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QSystemCntc systemCntc = new QSystemCntc("systemCntc");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath cntcId = createString("cntcId");

    public final StringPath cntcNm = createString("cntcNm");

    public final StringPath cntcType = createString("cntcType");

    public final StringPath confmAt = createString("confmAt");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final QCntcInstt provdInstt;

    public final QCntcSystem provdSys;

    public final QCntcInstt requstInstt;

    public final QCntcSystem requstSys;

    public final StringPath useAt = createString("useAt");

    public QSystemCntc(String variable) {
        this(SystemCntc.class, forVariable(variable), INITS);
    }

    public QSystemCntc(Path<? extends SystemCntc> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QSystemCntc(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QSystemCntc(PathMetadata metadata, PathInits inits) {
        this(SystemCntc.class, metadata, inits);
    }

    public QSystemCntc(Class<? extends SystemCntc> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.provdInstt = inits.isInitialized("provdInstt") ? new QCntcInstt(forProperty("provdInstt")) : null;
        this.provdSys = inits.isInitialized("provdSys") ? new QCntcSystem(forProperty("provdSys"), inits.get("provdSys")) : null;
        this.requstInstt = inits.isInitialized("requstInstt") ? new QCntcInstt(forProperty("requstInstt")) : null;
        this.requstSys = inits.isInitialized("requstSys") ? new QCntcSystem(forProperty("requstSys"), inits.get("requstSys")) : null;
    }

}