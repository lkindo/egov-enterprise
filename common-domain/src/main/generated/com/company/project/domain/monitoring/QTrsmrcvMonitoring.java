package com.company.project.domain.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QTrsmrcvMonitoring is a Querydsl query type for TrsmrcvMonitoring
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QTrsmrcvMonitoring extends EntityPathBase<TrsmrcvMonitoring> {

    private static final long serialVersionUID = 428786854L;

    public static final QTrsmrcvMonitoring trsmrcvMonitoring = new QTrsmrcvMonitoring("trsmrcvMonitoring");

    public final StringPath cntcId = createString("cntcId");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath mntrngSttus = createString("mntrngSttus");

    public final StringPath testClassNm = createString("testClassNm");

    public QTrsmrcvMonitoring(String variable) {
        super(TrsmrcvMonitoring.class, forVariable(variable));
    }

    public QTrsmrcvMonitoring(Path<? extends TrsmrcvMonitoring> path) {
        super(path.getType(), path.getMetadata());
    }

    public QTrsmrcvMonitoring(PathMetadata metadata) {
        super(TrsmrcvMonitoring.class, metadata);
    }

}
