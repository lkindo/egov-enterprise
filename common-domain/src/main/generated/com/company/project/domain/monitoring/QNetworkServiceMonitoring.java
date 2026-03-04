package com.company.project.domain.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QNetworkServiceMonitoring is a Querydsl query type for NetworkServiceMonitoring
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QNetworkServiceMonitoring extends EntityPathBase<NetworkServiceMonitoring> {

    private static final long serialVersionUID = -1555025218L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QNetworkServiceMonitoring networkServiceMonitoring = new QNetworkServiceMonitoring("networkServiceMonitoring");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> createdDate = createDateTime("createdDate", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final QNetworkServiceId id;

    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = createDateTime("lastModifiedDate", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath mntrngSttus = createString("mntrngSttus");

    public final StringPath sysNm = createString("sysNm");

    public QNetworkServiceMonitoring(String variable) {
        this(NetworkServiceMonitoring.class, forVariable(variable), INITS);
    }

    public QNetworkServiceMonitoring(Path<? extends NetworkServiceMonitoring> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QNetworkServiceMonitoring(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QNetworkServiceMonitoring(PathMetadata metadata, PathInits inits) {
        this(NetworkServiceMonitoring.class, metadata, inits);
    }

    public QNetworkServiceMonitoring(Class<? extends NetworkServiceMonitoring> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.id = inits.isInitialized("id") ? new QNetworkServiceId(forProperty("id")) : null;
    }

}