package com.company.project.domain.dam;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QMapTeam is a Querydsl query type for MapTeam
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QMapTeam extends EntityPathBase<MapTeam> {

    private static final long serialVersionUID = -1786748988L;

    public static final QMapTeam mapTeam = new QMapTeam("mapTeam");

    public final StringPath clYmd = createString("clYmd");

    public final StringPath knoUrl = createString("knoUrl");

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath orgnztId = createString("orgnztId");

    public final StringPath orgnztNm = createString("orgnztNm");

    public QMapTeam(String variable) {
        super(MapTeam.class, forVariable(variable));
    }

    public QMapTeam(Path<? extends MapTeam> path) {
        super(path.getType(), path.getMetadata());
    }

    public QMapTeam(PathMetadata metadata) {
        super(MapTeam.class, metadata);
    }

}
