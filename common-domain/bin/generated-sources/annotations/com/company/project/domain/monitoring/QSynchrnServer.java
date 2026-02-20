package com.company.project.domain.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QSynchrnServer is a Querydsl query type for SynchrnServer
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSynchrnServer extends EntityPathBase<SynchrnServer> {

    private static final long serialVersionUID = 1223505341L;

    public static final QSynchrnServer synchrnServer = new QSynchrnServer("synchrnServer");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath ftpId = createString("ftpId");

    public final StringPath ftpPassword = createString("ftpPassword");

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath reflctAt = createString("reflctAt");

    public final StringPath serverId = createString("serverId");

    public final StringPath serverIp = createString("serverIp");

    public final StringPath serverNm = createString("serverNm");

    public final StringPath serverPort = createString("serverPort");

    public final StringPath synchrnLc = createString("synchrnLc");

    public QSynchrnServer(String variable) {
        super(SynchrnServer.class, forVariable(variable));
    }

    public QSynchrnServer(Path<? extends SynchrnServer> path) {
        super(path.getType(), path.getMetadata());
    }

    public QSynchrnServer(PathMetadata metadata) {
        super(SynchrnServer.class, metadata);
    }

}

