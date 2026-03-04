package com.company.project.domain.integration;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QCntcSystem is a Querydsl query type for CntcSystem
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QCntcSystem extends EntityPathBase<CntcSystem> {

    private static final long serialVersionUID = 98698586L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QCntcSystem cntcSystem = new QCntcSystem("cntcSystem");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final QCntcInstt instt;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath sysId = createString("sysId");

    public final StringPath sysIp = createString("sysIp");

    public final StringPath sysNm = createString("sysNm");

    public final StringPath useAt = createString("useAt");

    public QCntcSystem(String variable) {
        this(CntcSystem.class, forVariable(variable), INITS);
    }

    public QCntcSystem(Path<? extends CntcSystem> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QCntcSystem(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QCntcSystem(PathMetadata metadata, PathInits inits) {
        this(CntcSystem.class, metadata, inits);
    }

    public QCntcSystem(Class<? extends CntcSystem> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.instt = inits.isInitialized("instt") ? new QCntcInstt(forProperty("instt")) : null;
    }

}
