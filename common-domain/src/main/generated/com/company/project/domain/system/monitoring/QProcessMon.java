package com.company.project.domain.system.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QProcessMon is a Querydsl query type for ProcessMon
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QProcessMon extends EntityPathBase<ProcessMon> {

    private static final long serialVersionUID = 1688192475L;

    public static final QProcessMon processMon = new QProcessMon("processMon");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath processNm = createString("processNm");

    public final StringPath procsSttus = createString("procsSttus");

    public QProcessMon(String variable) {
        super(ProcessMon.class, forVariable(variable));
    }

    public QProcessMon(Path<? extends ProcessMon> path) {
        super(path.getType(), path.getMetadata());
    }

    public QProcessMon(PathMetadata metadata) {
        super(ProcessMon.class, metadata);
    }

}