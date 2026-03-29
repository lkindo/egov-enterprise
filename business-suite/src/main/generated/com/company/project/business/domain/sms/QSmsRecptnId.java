package com.company.project.business.domain.sms;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QSmsRecptnId is a Querydsl query type for SmsRecptnId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QSmsRecptnId extends BeanPath<SmsRecptnId> {

    private static final long serialVersionUID = -237177494L;

    public static final QSmsRecptnId smsRecptnId = new QSmsRecptnId("smsRecptnId");

    public final StringPath recptnTelno = createString("recptnTelno");

    public final StringPath smsId = createString("smsId");

    public QSmsRecptnId(String variable) {
        super(SmsRecptnId.class, forVariable(variable));
    }

    public QSmsRecptnId(Path<? extends SmsRecptnId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QSmsRecptnId(PathMetadata metadata) {
        super(SmsRecptnId.class, metadata);
    }

}

