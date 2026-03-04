package com.company.project.domain.system;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QSynchrnServerSystem is a Querydsl query type for SynchrnServerSystem
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSynchrnServerSystem extends EntityPathBase<SynchrnServerSystem> {

    private static final long serialVersionUID = -1574340045L;

    public static final QSynchrnServerSystem synchrnServerSystem = new QSynchrnServerSystem("synchrnServerSystem");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath ftpId = createString("ftpId");

    public final StringPath ftpPassword = createString("ftpPassword");

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath reflctAt = createString("reflctAt");

    public final StringPath serverId = createString("serverId");

    public final StringPath serverIp = createString("serverIp");

    public final StringPath serverNm = createString("serverNm");

    public final StringPath serverPort = createString("serverPort");

    public final StringPath synchrnLc = createString("synchrnLc");

    public QSynchrnServerSystem(String variable) {
        super(SynchrnServerSystem.class, forVariable(variable));
    }

    public QSynchrnServerSystem(Path<? extends SynchrnServerSystem> path) {
        super(path.getType(), path.getMetadata());
    }

    public QSynchrnServerSystem(PathMetadata metadata) {
        super(SynchrnServerSystem.class, metadata);
    }

}
