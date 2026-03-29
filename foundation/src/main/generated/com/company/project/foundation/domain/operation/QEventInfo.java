package com.company.project.foundation.domain.operation;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QEventInfo is a Querydsl query type for EventInfo
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QEventInfo extends EntityPathBase<EventInfo> {

    private static final long serialVersionUID = 884834559L;

    public static final QEventInfo eventInfo = new QEventInfo("eventInfo");

    public final StringPath bsnsCode = createString("bsnsCode");

    public final StringPath bsnsYear = createString("bsnsYear");

    public final StringPath chargerNm = createString("chargerNm");

    public final StringPath eventCn = createString("eventCn");

    public final StringPath eventConfmAt = createString("eventConfmAt");

    public final StringPath eventConfmDe = createString("eventConfmDe");

    public final StringPath eventId = createString("eventId");

    public final StringPath eventSvcBgnde = createString("eventSvcBgnde");

    public final StringPath eventSvcEndde = createString("eventSvcEndde");

    public final StringPath eventTyCode = createString("eventTyCode");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath prparetgCn = createString("prparetgCn");

    public final NumberPath<Long> svcUseNmprCo = createNumber("svcUseNmprCo", Long.class);

    public QEventInfo(String variable) {
        super(EventInfo.class, forVariable(variable));
    }

    public QEventInfo(Path<? extends EventInfo> path) {
        super(path.getType(), path.getMetadata());
    }

    public QEventInfo(PathMetadata metadata) {
        super(EventInfo.class, metadata);
    }

}

