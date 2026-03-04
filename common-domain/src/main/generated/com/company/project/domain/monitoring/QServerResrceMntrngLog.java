package com.company.project.domain.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QServerResrceMntrngLog is a Querydsl query type for ServerResrceMntrngLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QServerResrceMntrngLog extends EntityPathBase<ServerResrceMntrngLog> {

    private static final long serialVersionUID = 1913218854L;

    public static final QServerResrceMntrngLog serverResrceMntrngLog = new QServerResrceMntrngLog("serverResrceMntrngLog");

    public final StringPath cpuUseRt = createString("cpuUseRt");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath logId = createString("logId");

    public final StringPath logInfo = createString("logInfo");

    public final StringPath moryUseRt = createString("moryUseRt");

    public final StringPath serverEqpmnId = createString("serverEqpmnId");

    public final StringPath serverId = createString("serverId");

    public final StringPath svcSttus = createString("svcSttus");

    public QServerResrceMntrngLog(String variable) {
        super(ServerResrceMntrngLog.class, forVariable(variable));
    }

    public QServerResrceMntrngLog(Path<? extends ServerResrceMntrngLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QServerResrceMntrngLog(PathMetadata metadata) {
        super(ServerResrceMntrngLog.class, metadata);
    }

}