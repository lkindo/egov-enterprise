package com.company.project.domain.code;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QAdministCodeRecptnLog is a Querydsl query type for AdministCodeRecptnLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QAdministCodeRecptnLog extends EntityPathBase<AdministCodeRecptnLog> {

    private static final long serialVersionUID = -1787384040L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QAdministCodeRecptnLog administCodeRecptnLog = new QAdministCodeRecptnLog("administCodeRecptnLog");

    public final StringPath ablDe = createString("ablDe");

    public final StringPath ablEnnc = createString("ablEnnc");

    public final StringPath administZoneNm = createString("administZoneNm");

    public final StringPath changeSeCode = createString("changeSeCode");

    public final StringPath creatDe = createString("creatDe");

    public final StringPath ctprvnCode = createString("ctprvnCode");

    public final StringPath emdCode = createString("emdCode");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final QAdministCodeRecptnLog_AdministCodeRecptnLogId id;

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath liCode = createString("liCode");

    public final StringPath lowestAdministZoneNm = createString("lowestAdministZoneNm");

    public final StringPath processSe = createString("processSe");

    public final StringPath signguCode = createString("signguCode");

    public QAdministCodeRecptnLog(String variable) {
        this(AdministCodeRecptnLog.class, forVariable(variable), INITS);
    }

    public QAdministCodeRecptnLog(Path<? extends AdministCodeRecptnLog> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QAdministCodeRecptnLog(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QAdministCodeRecptnLog(PathMetadata metadata, PathInits inits) {
        this(AdministCodeRecptnLog.class, metadata, inits);
    }

    public QAdministCodeRecptnLog(Class<? extends AdministCodeRecptnLog> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.id = inits.isInitialized("id") ? new QAdministCodeRecptnLog_AdministCodeRecptnLogId(forProperty("id")) : null;
    }

}
