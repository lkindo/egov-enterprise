package com.company.project.domain.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QHttpMonitoring is a Querydsl query type for HttpMonitoring
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QHttpMonitoring extends EntityPathBase<HttpMonitoring> {

    private static final long serialVersionUID = 1511206943L;

    public static final QHttpMonitoring httpMonitoring = new QHttpMonitoring("httpMonitoring");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> createdDate = createDateTime("createdDate", java.time.LocalDateTime.class);

    public final StringPath deleteAt = createString("deleteAt");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final StringPath httpSttusCd = createString("httpSttusCd");

    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = createDateTime("lastModifiedDate", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath siteUrl = createString("siteUrl");

    public final StringPath sysId = createString("sysId");

    public final StringPath webKind = createString("webKind");

    public QHttpMonitoring(String variable) {
        super(HttpMonitoring.class, forVariable(variable));
    }

    public QHttpMonitoring(Path<? extends HttpMonitoring> path) {
        super(path.getType(), path.getMetadata());
    }

    public QHttpMonitoring(PathMetadata metadata) {
        super(HttpMonitoring.class, metadata);
    }

}

