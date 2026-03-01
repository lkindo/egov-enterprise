package com.company.project.domain.system.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QNtwrkSvcMntrng is a Querydsl query type for NtwrkSvcMntrng
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QNtwrkSvcMntrng extends EntityPathBase<NtwrkSvcMntrng> {

    private static final long serialVersionUID = -1404398900L;

    public static final QNtwrkSvcMntrng ntwrkSvcMntrng = new QNtwrkSvcMntrng("ntwrkSvcMntrng");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath mntrngSttus = createString("mntrngSttus");

    public final StringPath sysIp = createString("sysIp");

    public final StringPath sysNm = createString("sysNm");

    public final NumberPath<Integer> sysPort = createNumber("sysPort", Integer.class);

    public QNtwrkSvcMntrng(String variable) {
        super(NtwrkSvcMntrng.class, forVariable(variable));
    }

    public QNtwrkSvcMntrng(Path<? extends NtwrkSvcMntrng> path) {
        super(path.getType(), path.getMetadata());
    }

    public QNtwrkSvcMntrng(PathMetadata metadata) {
        super(NtwrkSvcMntrng.class, metadata);
    }

}
