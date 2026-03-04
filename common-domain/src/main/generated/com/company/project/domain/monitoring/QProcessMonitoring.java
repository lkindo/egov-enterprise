package com.company.project.domain.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QProcessMonitoring is a Querydsl query type for ProcessMonitoring
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QProcessMonitoring extends EntityPathBase<ProcessMonitoring> {

    private static final long serialVersionUID = 1016376456L;

    public static final QProcessMonitoring processMonitoring = new QProcessMonitoring("processMonitoring");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> createdDate = createDateTime("createdDate", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = createDateTime("lastModifiedDate", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath processId = createString("processId");

    public final StringPath processNm = createString("processNm");

    public final StringPath procsSttus = createString("procsSttus");

    public QProcessMonitoring(String variable) {
        super(ProcessMonitoring.class, forVariable(variable));
    }

    public QProcessMonitoring(Path<? extends ProcessMonitoring> path) {
        super(path.getType(), path.getMetadata());
    }

    public QProcessMonitoring(PathMetadata metadata) {
        super(ProcessMonitoring.class, metadata);
    }

}