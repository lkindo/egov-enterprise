package com.company.project.domain.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QDbMonitoring is a Querydsl query type for DbMonitoring
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QDbMonitoring extends EntityPathBase<DbMonitoring> {

    private static final long serialVersionUID = -536430507L;

    public static final QDbMonitoring dbMonitoring = new QDbMonitoring("dbMonitoring");

    public final StringPath ceckSql = createString("ceckSql");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> createdDate = createDateTime("createdDate", java.time.LocalDateTime.class);

    public final StringPath dataSourcNm = createString("dataSourcNm");

    public final StringPath dbmsKind = createString("dbmsKind");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = createDateTime("lastModifiedDate", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath mntrngSttus = createString("mntrngSttus");

    public final StringPath serverNm = createString("serverNm");

    public QDbMonitoring(String variable) {
        super(DbMonitoring.class, forVariable(variable));
    }

    public QDbMonitoring(Path<? extends DbMonitoring> path) {
        super(path.getType(), path.getMetadata());
    }

    public QDbMonitoring(PathMetadata metadata) {
        super(DbMonitoring.class, metadata);
    }

}

