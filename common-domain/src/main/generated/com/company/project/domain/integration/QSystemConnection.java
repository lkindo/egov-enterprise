package com.company.project.domain.integration;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QSystemConnection is a Querydsl query type for SystemConnection
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSystemConnection extends EntityPathBase<SystemConnection> {

    private static final long serialVersionUID = 22658078L;

    public static final QSystemConnection systemConnection = new QSystemConnection("systemConnection");

    public final StringPath cntcId = createString("cntcId");

    public final StringPath cntcNm = createString("cntcNm");

    public final StringPath cntcType = createString("cntcType");

    public final StringPath confmAt = createString("confmAt");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath provdInsttId = createString("provdInsttId");

    public final StringPath provdSvcId = createString("provdSvcId");

    public final StringPath provdSysId = createString("provdSysId");

    public final StringPath requstInsttId = createString("requstInsttId");

    public final StringPath requstSysId = createString("requstSysId");

    public final StringPath useAt = createString("useAt");

    public final StringPath validBeginDe = createString("validBeginDe");

    public final StringPath validEndDe = createString("validEndDe");

    public QSystemConnection(String variable) {
        super(SystemConnection.class, forVariable(variable));
    }

    public QSystemConnection(Path<? extends SystemConnection> path) {
        super(path.getType(), path.getMetadata());
    }

    public QSystemConnection(PathMetadata metadata) {
        super(SystemConnection.class, metadata);
    }

}

