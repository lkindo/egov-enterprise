package com.company.project.domain.system;

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

    private static final long serialVersionUID = -1622054117L;

    public static final QEventCmpgn eventCmpgn = new QEventCmpgn("eventCmpgn");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath bsnsCode = createString("bsnsCode");

    public final StringPath bsnsYear = createString("bsnsYear");

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

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

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
