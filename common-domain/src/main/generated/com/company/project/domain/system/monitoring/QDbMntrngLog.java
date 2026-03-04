package com.company.project.domain.system.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QDbMntrngLog is a Querydsl query type for DbMntrngLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QDbMntrngLog extends EntityPathBase<DbMntrngLog> {

    private static final long serialVersionUID = -852677776L;

    public static final QDbMntrngLog dbMntrngLog = new QDbMntrngLog("dbMntrngLog");

    public final StringPath ceckSql = createString("ceckSql");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final StringPath dataSourcNm = createString("dataSourcNm");

    public final StringPath dbmsKind = createString("dbmsKind");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath logId = createString("logId");

    public final StringPath logInfo = createString("logInfo");

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath mntrngSttus = createString("mntrngSttus");

    public final StringPath serverNm = createString("serverNm");

    public QDbMntrngLog(String variable) {
        super(DbMntrngLog.class, forVariable(variable));
    }

    public QDbMntrngLog(Path<? extends DbMntrngLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QDbMntrngLog(PathMetadata metadata) {
        super(DbMntrngLog.class, metadata);
    }

}
