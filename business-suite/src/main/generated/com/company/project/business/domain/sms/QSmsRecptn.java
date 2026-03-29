package com.company.project.business.domain.sms;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QSmsRecptn is a Querydsl query type for SmsRecptn
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSmsRecptn extends EntityPathBase<SmsRecptn> {

    private static final long serialVersionUID = -549966865L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QSmsRecptn smsRecptn = new QSmsRecptn("smsRecptn");

    public final QSmsRecptnId id;

    public final StringPath resultCode = createString("resultCode");

    public final StringPath resultMssage = createString("resultMssage");

    public QSmsRecptn(String variable) {
        this(SmsRecptn.class, forVariable(variable), INITS);
    }

    public QSmsRecptn(Path<? extends SmsRecptn> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QSmsRecptn(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QSmsRecptn(PathMetadata metadata, PathInits inits) {
        this(SmsRecptn.class, metadata, inits);
    }

    public QSmsRecptn(Class<? extends SmsRecptn> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.id = inits.isInitialized("id") ? new QSmsRecptnId(forProperty("id")) : null;
    }

}

