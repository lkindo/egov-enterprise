package com.company.project.domain.event;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QEventInfo is a Querydsl query type for EventInfo
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QEventInfo extends EntityPathBase<EventInfo> {

    private static final long serialVersionUID = 1941206493L;

    public static final QEventInfo eventInfo = new QEventInfo("eventInfo");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath chargerNm = createString("chargerNm");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath eventCn = createString("eventCn");

    public final StringPath eventConfmAt = createString("eventConfmAt");

    public final StringPath eventConfmDe = createString("eventConfmDe");

    public final StringPath eventId = createString("eventId");

    public final StringPath eventSvcBeginDe = createString("eventSvcBeginDe");

    public final StringPath eventSvcEndDe = createString("eventSvcEndDe");

    public final StringPath eventTyCode = createString("eventTyCode");

    public final ListPath<ExternalHr, QExternalHr> externalHrs = this.<ExternalHr, QExternalHr>createList("externalHrs", ExternalHr.class, QExternalHr.class, PathInits.DIRECT2);

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath prparetgCn = createString("prparetgCn");

    public final NumberPath<Integer> svcUseNmprCo = createNumber("svcUseNmprCo", Integer.class);

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
