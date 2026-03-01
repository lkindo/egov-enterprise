package com.company.project.domain.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QProxySvc is a Querydsl query type for ProxySvc
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QProxySvc extends EntityPathBase<ProxySvc> {

    private static final long serialVersionUID = 311049601L;

    public static final QProxySvc proxySvc = new QProxySvc("proxySvc");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath proxyId = createString("proxyId");

    public final StringPath proxyIp = createString("proxyIp");

    public final StringPath proxyNm = createString("proxyNm");

    public final StringPath proxyPort = createString("proxyPort");

    public final StringPath svcDc = createString("svcDc");

    public final StringPath svcIp = createString("svcIp");

    public final StringPath svcPort = createString("svcPort");

    public final StringPath svcSttus = createString("svcSttus");

    public final StringPath trgetSvcNm = createString("trgetSvcNm");

    public QProxySvc(String variable) {
        super(ProxySvc.class, forVariable(variable));
    }

    public QProxySvc(Path<? extends ProxySvc> path) {
        super(path.getType(), path.getMetadata());
    }

    public QProxySvc(PathMetadata metadata) {
        super(ProxySvc.class, metadata);
    }

}
