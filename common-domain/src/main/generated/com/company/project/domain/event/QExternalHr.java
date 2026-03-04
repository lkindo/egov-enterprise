package com.company.project.domain.event;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QExternalHr is a Querydsl query type for ExternalHr
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QExternalHr extends EntityPathBase<ExternalHr> {

    private static final long serialVersionUID = 1679199584L;

    public static final QExternalHr externalHr = new QExternalHr("externalHr");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath areaNo = createString("areaNo");

    public final StringPath brth = createString("brth");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath emailAdres = createString("emailAdres");

    public final StringPath endTelno = createString("endTelno");

    public final StringPath eventId = createString("eventId");

    public final StringPath extrlHrId = createString("extrlHrId");

    public final StringPath extrlHrNm = createString("extrlHrNm");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath middleTelno = createString("middleTelno");

    public final StringPath occpTyCode = createString("occpTyCode");

    public final StringPath psitnInsttNm = createString("psitnInsttNm");

    public final StringPath sexdstnCode = createString("sexdstnCode");

    public QExternalHr(String variable) {
        super(ExternalHr.class, forVariable(variable));
    }

    public QExternalHr(Path<? extends ExternalHr> path) {
        super(path.getType(), path.getMetadata());
    }

    public QExternalHr(PathMetadata metadata) {
        super(ExternalHr.class, metadata);
    }

}
