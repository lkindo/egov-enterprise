package com.company.project.domain.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QProcessMonitoringLog is a Querydsl query type for ProcessMonitoringLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QProcessMonitoringLog extends EntityPathBase<ProcessMonitoringLog> {

    private static final long serialVersionUID = -648359524L;

    public static final QProcessMonitoringLog processMonitoringLog = new QProcessMonitoringLog("processMonitoringLog");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> createdDate = createDateTime("createdDate", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = createDateTime("lastModifiedDate", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath logId = createString("logId");

    public final StringPath logInfo = createString("logInfo");

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath processId = createString("processId");

    public final StringPath processNm = createString("processNm");

    public final StringPath procsSttus = createString("procsSttus");

    public QProcessMonitoringLog(String variable) {
        super(ProcessMonitoringLog.class, forVariable(variable));
    }

    public QProcessMonitoringLog(Path<? extends ProcessMonitoringLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QProcessMonitoringLog(PathMetadata metadata) {
        super(ProcessMonitoringLog.class, metadata);
    }

}
