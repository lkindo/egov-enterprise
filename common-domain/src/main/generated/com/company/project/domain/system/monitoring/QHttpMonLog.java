package com.company.project.domain.system.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QHttpMonLog is a Querydsl query type for HttpMonLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QHttpMonLog extends EntityPathBase<HttpMonLog> {

    private static final long serialVersionUID = 2026178302L;

    public static final QHttpMonLog httpMonLog = new QHttpMonLog("httpMonLog");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath httpSttusCd = createString("httpSttusCd");

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath logId = createString("logId");

    public final StringPath logInfo = createString("logInfo");

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath siteUrl = createString("siteUrl");

    public final StringPath sysId = createString("sysId");

    public final StringPath webKind = createString("webKind");

    public QHttpMonLog(String variable) {
        super(HttpMonLog.class, forVariable(variable));
    }

    public QHttpMonLog(Path<? extends HttpMonLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QHttpMonLog(PathMetadata metadata) {
        super(HttpMonLog.class, metadata);
    }

}
