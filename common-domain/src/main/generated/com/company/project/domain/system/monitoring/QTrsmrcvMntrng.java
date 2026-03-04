package com.company.project.domain.system.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QTrsmrcvMntrng is a Querydsl query type for TrsmrcvMntrng
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QTrsmrcvMntrng extends EntityPathBase<TrsmrcvMntrng> {

    private static final long serialVersionUID = -42017849L;

    public static final QTrsmrcvMntrng trsmrcvMntrng = new QTrsmrcvMntrng("trsmrcvMntrng");

    public final StringPath cntcId = createString("cntcId");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath mntrngSttus = createString("mntrngSttus");

    public final StringPath testClassNm = createString("testClassNm");

    public QTrsmrcvMntrng(String variable) {
        super(TrsmrcvMntrng.class, forVariable(variable));
    }

    public QTrsmrcvMntrng(Path<? extends TrsmrcvMntrng> path) {
        super(path.getType(), path.getMetadata());
    }

    public QTrsmrcvMntrng(PathMetadata metadata) {
        super(TrsmrcvMntrng.class, metadata);
    }

}