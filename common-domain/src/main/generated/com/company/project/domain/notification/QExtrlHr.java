package com.company.project.domain.notification;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QExtrlHr is a Querydsl query type for ExtrlHr
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QExtrlHr extends EntityPathBase<ExtrlHr> {

    private static final long serialVersionUID = 426035225L;

    public static final QExtrlHr extrlHr = new QExtrlHr("extrlHr");

    public final StringPath areaNo = createString("areaNo");

    public final StringPath brth = createString("brth");

    public final StringPath emailAdres = createString("emailAdres");

    public final StringPath endTelno = createString("endTelno");

    public final StringPath eventId = createString("eventId");

    public final StringPath extrlHrId = createString("extrlHrId");

    public final StringPath extrlHrNm = createString("extrlHrNm");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath middleTelno = createString("middleTelno");

    public final StringPath occpTyCode = createString("occpTyCode");

    public final StringPath psitnInsttNm = createString("psitnInsttNm");

    public final StringPath sexdstnCode = createString("sexdstnCode");

    public QExtrlHr(String variable) {
        super(ExtrlHr.class, forVariable(variable));
    }

    public QExtrlHr(Path<? extends ExtrlHr> path) {
        super(path.getType(), path.getMetadata());
    }

    public QExtrlHr(PathMetadata metadata) {
        super(ExtrlHr.class, metadata);
    }

}
