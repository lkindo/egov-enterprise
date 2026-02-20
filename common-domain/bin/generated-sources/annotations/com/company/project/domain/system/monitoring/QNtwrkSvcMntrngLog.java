package com.company.project.domain.system.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QNtwrkSvcMntrngLog is a Querydsl query type for NtwrkSvcMntrngLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QNtwrkSvcMntrngLog extends EntityPathBase<NtwrkSvcMntrngLog> {

    private static final long serialVersionUID = -1171122984L;

    public static final QNtwrkSvcMntrngLog ntwrkSvcMntrngLog = new QNtwrkSvcMntrngLog("ntwrkSvcMntrngLog");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath logId = createString("logId");

    public final StringPath logInfo = createString("logInfo");

    public final StringPath mntrngSttus = createString("mntrngSttus");

    public final StringPath sysIp = createString("sysIp");

    public final StringPath sysNm = createString("sysNm");

    public final NumberPath<Integer> sysPort = createNumber("sysPort", Integer.class);

    public QNtwrkSvcMntrngLog(String variable) {
        super(NtwrkSvcMntrngLog.class, forVariable(variable));
    }

    public QNtwrkSvcMntrngLog(Path<? extends NtwrkSvcMntrngLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QNtwrkSvcMntrngLog(PathMetadata metadata) {
        super(NtwrkSvcMntrngLog.class, metadata);
    }

}

