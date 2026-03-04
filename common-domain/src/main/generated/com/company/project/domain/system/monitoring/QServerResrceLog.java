package com.company.project.domain.system.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QServerResrceLog is a Querydsl query type for ServerResrceLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QServerResrceLog extends EntityPathBase<ServerResrceLog> {

    private static final long serialVersionUID = -968952337L;

    public static final QServerResrceLog serverResrceLog = new QServerResrceLog("serverResrceLog");

    public final NumberPath<Double> cpuUseRt = createNumber("cpuUseRt", Double.class);

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath logId = createString("logId");

    public final StringPath logInfo = createString("logInfo");

    public final NumberPath<Double> moryUseRt = createNumber("moryUseRt", Double.class);

    public final StringPath serverEqpmnId = createString("serverEqpmnId");

    public final StringPath serverId = createString("serverId");

    public final StringPath svcSttus = createString("svcSttus");

    public QServerResrceLog(String variable) {
        super(ServerResrceLog.class, forVariable(variable));
    }

    public QServerResrceLog(Path<? extends ServerResrceLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QServerResrceLog(PathMetadata metadata) {
        super(ServerResrceLog.class, metadata);
    }

}