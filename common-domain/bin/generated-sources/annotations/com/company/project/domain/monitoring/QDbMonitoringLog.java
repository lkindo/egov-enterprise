package com.company.project.domain.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QDbMonitoringLog is a Querydsl query type for DbMonitoringLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QDbMonitoringLog extends EntityPathBase<DbMonitoringLog> {

    private static final long serialVersionUID = 772150959L;

    public static final QDbMonitoringLog dbMonitoringLog = new QDbMonitoringLog("dbMonitoringLog");

    public final StringPath ceckSql = createString("ceckSql");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> createdDate = createDateTime("createdDate", java.time.LocalDateTime.class);

    public final StringPath dataSourcNm = createString("dataSourcNm");

    public final StringPath dbmsKind = createString("dbmsKind");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = createDateTime("lastModifiedDate", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath logId = createString("logId");

    public final StringPath logInfo = createString("logInfo");

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath mntrngSttus = createString("mntrngSttus");

    public final StringPath serverNm = createString("serverNm");

    public QDbMonitoringLog(String variable) {
        super(DbMonitoringLog.class, forVariable(variable));
    }

    public QDbMonitoringLog(Path<? extends DbMonitoringLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QDbMonitoringLog(PathMetadata metadata) {
        super(DbMonitoringLog.class, metadata);
    }

}

