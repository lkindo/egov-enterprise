package com.company.project.foundation.domain.operation;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QExternalHr is a Querydsl query type for ExternalHr
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QExternalHr extends EntityPathBase<ExternalHr> {

    private static final long serialVersionUID = -1003559298L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QExternalHr externalHr = new QExternalHr("externalHr");

    public final StringPath areaNo = createString("areaNo");

    public final StringPath brthdy = createString("brthdy");

    public final StringPath emailAdres = createString("emailAdres");

    public final StringPath endTelno = createString("endTelno");

    public final QEventInfo event;

    public final StringPath eventId = createString("eventId");

    public final StringPath extrlHrId = createString("extrlHrId");

    public final StringPath extrlHrNm = createString("extrlHrNm");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath middleTelno = createString("middleTelno");

    public final StringPath occpTyCode = createString("occpTyCode");

    public final StringPath psitnInsttNm = createString("psitnInsttNm");

    public final StringPath sexdstnCode = createString("sexdstnCode");

    public QExternalHr(String variable) {
        this(ExternalHr.class, forVariable(variable), INITS);
    }

    public QExternalHr(Path<? extends ExternalHr> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QExternalHr(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QExternalHr(PathMetadata metadata, PathInits inits) {
        this(ExternalHr.class, metadata, inits);
    }

    public QExternalHr(Class<? extends ExternalHr> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.event = inits.isInitialized("event") ? new QEventInfo(forProperty("event")) : null;
    }

}

