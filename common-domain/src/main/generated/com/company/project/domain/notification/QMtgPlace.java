package com.company.project.domain.notification;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QMtgPlace is a Querydsl query type for MtgPlace
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QMtgPlace extends EntityPathBase<MtgPlace> {

    private static final long serialVersionUID = 1721168435L;

    public static final QMtgPlace mtgPlace = new QMtgPlace("mtgPlace");

    public final NumberPath<Integer> aceptncPosblNmpr = createNumber("aceptncPosblNmpr", Integer.class);

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath lcDetail = createString("lcDetail");

    public final StringPath lcSe = createString("lcSe");

    public final StringPath mtgrumId = createString("mtgrumId");

    public final StringPath mtgrumNm = createString("mtgrumNm");

    public final StringPath opnBeginTm = createString("opnBeginTm");

    public final StringPath opnEndTm = createString("opnEndTm");

    public QMtgPlace(String variable) {
        super(MtgPlace.class, forVariable(variable));
    }

    public QMtgPlace(Path<? extends MtgPlace> path) {
        super(path.getType(), path.getMetadata());
    }

    public QMtgPlace(PathMetadata metadata) {
        super(MtgPlace.class, metadata);
    }

}
