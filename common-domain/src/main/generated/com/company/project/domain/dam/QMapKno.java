package com.company.project.domain.dam;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QMapKno is a Querydsl query type for MapKno
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QMapKno extends EntityPathBase<MapKno> {

    private static final long serialVersionUID = 635091237L;

    public static final QMapKno mapKno = new QMapKno("mapKno");

    public final StringPath clYmd = createString("clYmd");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath knoTypeCd = createString("knoTypeCd");

    public final StringPath knoTypeNm = createString("knoTypeNm");

    public final StringPath knoUrl = createString("knoUrl");

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath orgnztId = createString("orgnztId");

    public final StringPath speId = createString("speId");

    public QMapKno(String variable) {
        super(MapKno.class, forVariable(variable));
    }

    public QMapKno(Path<? extends MapKno> path) {
        super(path.getType(), path.getMetadata());
    }

    public QMapKno(PathMetadata metadata) {
        super(MapKno.class, metadata);
    }

}

