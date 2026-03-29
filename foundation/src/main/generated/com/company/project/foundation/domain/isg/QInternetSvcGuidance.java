package com.company.project.foundation.domain.isg;

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

    private static final long serialVersionUID = 1838981188L;

    public static final QInternetSvcGuidance internetSvcGuidance = new QInternetSvcGuidance("internetSvcGuidance");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath intnetSvcDc = createString("intnetSvcDc");

    public final StringPath intnetSvcId = createString("intnetSvcId");

    public final StringPath intnetSvcNm = createString("intnetSvcNm");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

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

