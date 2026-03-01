package com.company.project.domain.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QHttpMonitoringLog is a Querydsl query type for HttpMonitoringLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QHttpMonitoringLog extends EntityPathBase<HttpMonitoringLog> {

    private static final long serialVersionUID = 518918821L;

    public static final QHttpMonitoringLog httpMonitoringLog = new QHttpMonitoringLog("httpMonitoringLog");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> createdDate = createDateTime("createdDate", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final StringPath httpSttusCd = createString("httpSttusCd");

    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = createDateTime("lastModifiedDate", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath logId = createString("logId");

    public final StringPath logInfo = createString("logInfo");

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath siteUrl = createString("siteUrl");

    public final StringPath sysId = createString("sysId");

    public final StringPath webKind = createString("webKind");

    public QHttpMonitoringLog(String variable) {
        super(HttpMonitoringLog.class, forVariable(variable));
    }

    public QHttpMonitoringLog(Path<? extends HttpMonitoringLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QHttpMonitoringLog(PathMetadata metadata) {
        super(HttpMonitoringLog.class, metadata);
    }

}
