package com.company.project.domain.notification;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QEventCmpgn is a Querydsl query type for EventCmpgn
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QEventCmpgn extends EntityPathBase<EventCmpgn> {

    private static final long serialVersionUID = 303948831L;

    public static final QEventCmpgn eventCmpgn = new QEventCmpgn("eventCmpgn");

    public final StringPath chargerNm = createString("chargerNm");

    public final StringPath eventCn = createString("eventCn");

    public final StringPath eventConfmAt = createString("eventConfmAt");

    public final StringPath eventConfmDe = createString("eventConfmDe");

    public final StringPath eventId = createString("eventId");

    public final StringPath eventSvcBeginDe = createString("eventSvcBeginDe");

    public final StringPath eventSvcEndDe = createString("eventSvcEndDe");

    public final StringPath eventTyCode = createString("eventTyCode");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath prparetgCn = createString("prparetgCn");

    public final NumberPath<Integer> svcUseNmprCo = createNumber("svcUseNmprCo", Integer.class);

    public QEventCmpgn(String variable) {
        super(EventCmpgn.class, forVariable(variable));
    }

    public QEventCmpgn(Path<? extends EventCmpgn> path) {
        super(path.getType(), path.getMetadata());
    }

    public QEventCmpgn(PathMetadata metadata) {
        super(EventCmpgn.class, metadata);
    }

}