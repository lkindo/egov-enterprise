package com.company.project.domain.system.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QHttpMon is a Querydsl query type for HttpMon
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QHttpMon extends EntityPathBase<HttpMon> {

    private static final long serialVersionUID = -1249164698L;

    public static final QHttpMon httpMon = new QHttpMon("httpMon");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final StringPath deleteAt = createString("deleteAt");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath httpSttusCd = createString("httpSttusCd");

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath siteUrl = createString("siteUrl");

    public final StringPath sysId = createString("sysId");

    public final StringPath webKind = createString("webKind");

    public QHttpMon(String variable) {
        super(HttpMon.class, forVariable(variable));
    }

    public QHttpMon(Path<? extends HttpMon> path) {
        super(path.getType(), path.getMetadata());
    }

    public QHttpMon(PathMetadata metadata) {
        super(HttpMon.class, metadata);
    }

}

