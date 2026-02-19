package com.company.project.domain.integration;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QIntegrationService is a Querydsl query type for IntegrationService
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QIntegrationService extends EntityPathBase<IntegrationService> {

    private static final long serialVersionUID = -731158606L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QIntegrationService integrationService = new QIntegrationService("integrationService");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final QIntegrationService_IntegrationServiceId id;

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath requestMessageId = createString("requestMessageId");

    public final StringPath rspnsMessageId = createString("rspnsMessageId");

    public final StringPath svcNm = createString("svcNm");

    public final StringPath useAt = createString("useAt");

    public QIntegrationService(String variable) {
        this(IntegrationService.class, forVariable(variable), INITS);
    }

    public QIntegrationService(Path<? extends IntegrationService> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QIntegrationService(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QIntegrationService(PathMetadata metadata, PathInits inits) {
        this(IntegrationService.class, metadata, inits);
    }

    public QIntegrationService(Class<? extends IntegrationService> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.id = inits.isInitialized("id") ? new QIntegrationService_IntegrationServiceId(forProperty("id")) : null;
    }

}

