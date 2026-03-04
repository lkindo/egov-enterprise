package com.company.project.domain.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QTrsmrcvMonitoringLog is a Querydsl query type for TrsmrcvMonitoringLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QTrsmrcvMonitoringLog extends EntityPathBase<TrsmrcvMonitoringLog> {

    private static final long serialVersionUID = 756505790L;

    public static final QTrsmrcvMonitoringLog trsmrcvMonitoringLog = new QTrsmrcvMonitoringLog("trsmrcvMonitoringLog");

    public final StringPath cntcId = createString("cntcId");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath logId = createString("logId");

    public final StringPath logInfo = createString("logInfo");

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath mntrngSttus = createString("mntrngSttus");

    public final StringPath testClassNm = createString("testClassNm");

    public QTrsmrcvMonitoringLog(String variable) {
        super(TrsmrcvMonitoringLog.class, forVariable(variable));
    }

    public QTrsmrcvMonitoringLog(Path<? extends TrsmrcvMonitoringLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QTrsmrcvMonitoringLog(PathMetadata metadata) {
        super(TrsmrcvMonitoringLog.class, metadata);
    }

}