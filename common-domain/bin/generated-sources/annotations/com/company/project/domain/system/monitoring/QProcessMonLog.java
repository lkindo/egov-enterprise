package com.company.project.domain.system.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QProcessMonLog is a Querydsl query type for ProcessMonLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QProcessMonLog extends EntityPathBase<ProcessMonLog> {

    private static final long serialVersionUID = -1124936855L;

    public static final QProcessMonLog processMonLog = new QProcessMonLog("processMonLog");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath logId = createString("logId");

    public final StringPath logInfo = createString("logInfo");

    public final StringPath processNm = createString("processNm");

    public final StringPath procsSttus = createString("procsSttus");

    public QProcessMonLog(String variable) {
        super(ProcessMonLog.class, forVariable(variable));
    }

    public QProcessMonLog(Path<? extends ProcessMonLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QProcessMonLog(PathMetadata metadata) {
        super(ProcessMonLog.class, metadata);
    }

}

