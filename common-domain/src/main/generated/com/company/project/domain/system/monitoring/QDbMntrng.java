package com.company.project.domain.system.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QDbMntrng is a Querydsl query type for DbMntrng
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QDbMntrng extends EntityPathBase<DbMntrng> {

    private static final long serialVersionUID = 1636877108L;

    public static final QDbMntrng dbMntrng = new QDbMntrng("dbMntrng");

    public final StringPath ceckSql = createString("ceckSql");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final StringPath dataSourcNm = createString("dataSourcNm");

    public final StringPath dbmsKind = createString("dbmsKind");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath mntrngSttus = createString("mntrngSttus");

    public final StringPath serverNm = createString("serverNm");

    public QDbMntrng(String variable) {
        super(DbMntrng.class, forVariable(variable));
    }

    public QDbMntrng(Path<? extends DbMntrng> path) {
        super(path.getType(), path.getMetadata());
    }

    public QDbMntrng(PathMetadata metadata) {
        super(DbMntrng.class, metadata);
    }

}