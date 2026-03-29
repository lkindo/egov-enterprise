package com.company.project.foundation.domain.log;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QSysLogSummary is a Querydsl query type for SysLogSummary
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSysLogSummary extends EntityPathBase<SysLogSummary> {

    private static final long serialVersionUID = -2029841629L;

    public static final QSysLogSummary sysLogSummary = new QSysLogSummary("sysLogSummary");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final NumberPath<Long> creatCo = createNumber("creatCo", Long.class);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final NumberPath<Long> deleteCo = createNumber("deleteCo", Long.class);

    public final NumberPath<Long> errorCo = createNumber("errorCo", Long.class);

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath methodNm = createString("methodNm");

    public final StringPath occrrncDe = createString("occrrncDe");

    public final NumberPath<Long> outptCo = createNumber("outptCo", Long.class);

    public final NumberPath<Long> rdcnt = createNumber("rdcnt", Long.class);

    public final StringPath srvcNm = createString("srvcNm");

    public final NumberPath<Long> updtCo = createNumber("updtCo", Long.class);

    public QSysLogSummary(String variable) {
        super(SysLogSummary.class, forVariable(variable));
    }

    public QSysLogSummary(Path<? extends SysLogSummary> path) {
        super(path.getType(), path.getMetadata());
    }

    public QSysLogSummary(PathMetadata metadata) {
        super(SysLogSummary.class, metadata);
    }

}

