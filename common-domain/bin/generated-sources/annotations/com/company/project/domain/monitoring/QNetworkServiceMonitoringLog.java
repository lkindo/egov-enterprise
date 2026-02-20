package com.company.project.domain.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QNetworkServiceMonitoringLog is a Querydsl query type for NetworkServiceMonitoringLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QNetworkServiceMonitoringLog extends EntityPathBase<NetworkServiceMonitoringLog> {

    private static final long serialVersionUID = -238938202L;

    public static final QNetworkServiceMonitoringLog networkServiceMonitoringLog = new QNetworkServiceMonitoringLog("networkServiceMonitoringLog");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> createdDate = createDateTime("createdDate", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = createDateTime("lastModifiedDate", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath logId = createString("logId");

    public final StringPath logInfo = createString("logInfo");

    public final StringPath mntrngSttus = createString("mntrngSttus");

    public final StringPath sysIp = createString("sysIp");

    public final StringPath sysNm = createString("sysNm");

    public final NumberPath<Integer> sysPort = createNumber("sysPort", Integer.class);

    public QNetworkServiceMonitoringLog(String variable) {
        super(NetworkServiceMonitoringLog.class, forVariable(variable));
    }

    public QNetworkServiceMonitoringLog(Path<? extends NetworkServiceMonitoringLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QNetworkServiceMonitoringLog(PathMetadata metadata) {
        super(NetworkServiceMonitoringLog.class, metadata);
    }

}

