package com.company.project.domain.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QProxyLog is a Querydsl query type for ProxyLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QProxyLog extends EntityPathBase<ProxyLog> {

    private static final long serialVersionUID = 311042661L;

    public static final QProxyLog proxyLog = new QProxyLog("proxyLog");

    public final StringPath clntIp = createString("clntIp");

    public final StringPath clntPort = createString("clntPort");

    public final DateTimePath<java.time.LocalDateTime> conectTime = createDateTime("conectTime", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath logId = createString("logId");

    public final StringPath proxyId = createString("proxyId");

    public QProxyLog(String variable) {
        super(ProxyLog.class, forVariable(variable));
    }

    public QProxyLog(Path<? extends ProxyLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QProxyLog(PathMetadata metadata) {
        super(ProxyLog.class, metadata);
    }

}
