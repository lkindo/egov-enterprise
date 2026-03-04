package com.company.project.domain.integration;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QIntegrationMessage is a Querydsl query type for IntegrationMessage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QIntegrationMessage extends EntityPathBase<IntegrationMessage> {

    private static final long serialVersionUID = -1760386812L;

    public static final QIntegrationMessage integrationMessage = new QIntegrationMessage("integrationMessage");

    public final StringPath cntcMessageId = createString("cntcMessageId");

    public final StringPath cntcMessageNm = createString("cntcMessageNm");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath upperCntcMessageId = createString("upperCntcMessageId");

    public final StringPath useAt = createString("useAt");

    public QIntegrationMessage(String variable) {
        super(IntegrationMessage.class, forVariable(variable));
    }

    public QIntegrationMessage(Path<? extends IntegrationMessage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QIntegrationMessage(PathMetadata metadata) {
        super(IntegrationMessage.class, metadata);
    }

}
