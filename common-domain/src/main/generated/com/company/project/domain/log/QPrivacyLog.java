package com.company.project.domain.log;

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

    private static final long serialVersionUID = 1880745117L;

    public static final QPrivacyLog privacyLog = new QPrivacyLog("privacyLog");

    public final DateTimePath<java.time.LocalDateTime> inquiryDatetime = createDateTime("inquiryDatetime", java.time.LocalDateTime.class);

    public final StringPath inquiryInfo = createString("inquiryInfo");

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
