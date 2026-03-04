package com.company.project.domain.notification;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QIntnetSvc is a Querydsl query type for IntnetSvc
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QIntnetSvc extends EntityPathBase<IntnetSvc> {

    private static final long serialVersionUID = -1904823098L;

    public static final QIntnetSvc intnetSvc = new QIntnetSvc("intnetSvc");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath intnetSvcDc = createString("intnetSvcDc");

    public final StringPath intnetSvcId = createString("intnetSvcId");

    public final StringPath intnetSvcNm = createString("intnetSvcNm");

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath reflctAt = createString("reflctAt");

    public QIntnetSvc(String variable) {
        super(IntnetSvc.class, forVariable(variable));
    }

    public QIntnetSvc(Path<? extends IntnetSvc> path) {
        super(path.getType(), path.getMetadata());
    }

    public QIntnetSvc(PathMetadata metadata) {
        super(IntnetSvc.class, metadata);
    }

}