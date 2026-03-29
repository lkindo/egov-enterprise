package com.company.project.foundation.domain.log;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QPrivacyLog is a Querydsl query type for PrivacyLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QPrivacyLog extends EntityPathBase<PrivacyLog> {

    private static final long serialVersionUID = 1968155240L;

    public static final QPrivacyLog privacyLog = new QPrivacyLog("privacyLog");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final DateTimePath<java.time.LocalDateTime> inquiryDatetime = createDateTime("inquiryDatetime", java.time.LocalDateTime.class);

    public final StringPath inquiryInfo = createString("inquiryInfo");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath requesterId = createString("requesterId");

    public final StringPath requesterIp = createString("requesterIp");

    public final StringPath requestId = createString("requestId");

    public final StringPath serviceName = createString("serviceName");

    public QPrivacyLog(String variable) {
        super(PrivacyLog.class, forVariable(variable));
    }

    public QPrivacyLog(Path<? extends PrivacyLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QPrivacyLog(PathMetadata metadata) {
        super(PrivacyLog.class, metadata);
    }

}

