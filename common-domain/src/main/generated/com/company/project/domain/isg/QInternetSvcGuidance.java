package com.company.project.domain.isg;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QInternetSvcGuidance is a Querydsl query type for InternetSvcGuidance
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QInternetSvcGuidance extends EntityPathBase<InternetSvcGuidance> {

    private static final long serialVersionUID = 753406383L;

    public static final QInternetSvcGuidance internetSvcGuidance = new QInternetSvcGuidance("internetSvcGuidance");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final StringPath intnetSvcDc = createString("intnetSvcDc");

    public final StringPath intnetSvcId = createString("intnetSvcId");

    public final StringPath intnetSvcNm = createString("intnetSvcNm");

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath reflctAt = createString("reflctAt");

    public QInternetSvcGuidance(String variable) {
        super(InternetSvcGuidance.class, forVariable(variable));
    }

    public QInternetSvcGuidance(Path<? extends InternetSvcGuidance> path) {
        super(path.getType(), path.getMetadata());
    }

    public QInternetSvcGuidance(PathMetadata metadata) {
        super(InternetSvcGuidance.class, metadata);
    }

}