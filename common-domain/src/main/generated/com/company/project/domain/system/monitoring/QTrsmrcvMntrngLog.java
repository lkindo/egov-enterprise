package com.company.project.domain.system.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QTrsmrcvMntrngLog is a Querydsl query type for TrsmrcvMntrngLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QTrsmrcvMntrngLog extends EntityPathBase<TrsmrcvMntrngLog> {

    private static final long serialVersionUID = -1918179843L;

    public static final QTrsmrcvMntrngLog trsmrcvMntrngLog = new QTrsmrcvMntrngLog("trsmrcvMntrngLog");

    public final StringPath cntcId = createString("cntcId");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath logId = createString("logId");

    public final StringPath logInfo = createString("logInfo");

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath mntrngSttus = createString("mntrngSttus");

    public final StringPath testClassNm = createString("testClassNm");

    public QTrsmrcvMntrngLog(String variable) {
        super(TrsmrcvMntrngLog.class, forVariable(variable));
    }

    public QTrsmrcvMntrngLog(Path<? extends TrsmrcvMntrngLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QTrsmrcvMntrngLog(PathMetadata metadata) {
        super(TrsmrcvMntrngLog.class, metadata);
    }

}
