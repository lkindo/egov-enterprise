package com.company.project.domain.notification;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QMtgPlaceResve is a Querydsl query type for MtgPlaceResve
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QMtgPlaceResve extends EntityPathBase<MtgPlaceResve> {

    private static final long serialVersionUID = -1750424356L;

    public static final QMtgPlaceResve mtgPlaceResve = new QMtgPlaceResve("mtgPlaceResve");

    public final NumberPath<Integer> atndncNmpr = createNumber("atndncNmpr", Integer.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath mtgCn = createString("mtgCn");

    public final StringPath mtgrumId = createString("mtgrumId");

    public final StringPath mtgSj = createString("mtgSj");

    public final StringPath resveBeginTm = createString("resveBeginTm");

    public final StringPath resveDe = createString("resveDe");

    public final StringPath resveEndTm = createString("resveEndTm");

    public final StringPath resveId = createString("resveId");

    public final StringPath rsvctmId = createString("rsvctmId");

    public QMtgPlaceResve(String variable) {
        super(MtgPlaceResve.class, forVariable(variable));
    }

    public QMtgPlaceResve(Path<? extends MtgPlaceResve> path) {
        super(path.getType(), path.getMetadata());
    }

    public QMtgPlaceResve(PathMetadata metadata) {
        super(MtgPlaceResve.class, metadata);
    }

}

