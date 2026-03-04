package com.company.project.domain.commute;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QCommute is a Querydsl query type for Commute
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QCommute extends EntityPathBase<Commute> {

    private static final long serialVersionUID = -1403691505L;

    public static final QCommute commute = new QCommute("commute");

    public final StringPath emplyrId = createString("emplyrId");

    public final StringPath orgnztId = createString("orgnztId");

    public final StringPath ovtmwrkHours = createString("ovtmwrkHours");

    public final StringPath rm = createString("rm");

    public final StringPath wrkEndStatus = createString("wrkEndStatus");

    public final StringPath wrkEndTime = createString("wrkEndTime");

    public final StringPath wrkHours = createString("wrkHours");

    public final StringPath wrkStartStatus = createString("wrkStartStatus");

    public final StringPath wrkStartTime = createString("wrkStartTime");

    public final StringPath wrktDt = createString("wrktDt");

    public final StringPath wrktmId = createString("wrktmId");

    public QCommute(String variable) {
        super(Commute.class, forVariable(variable));
    }

    public QCommute(Path<? extends Commute> path) {
        super(path.getType(), path.getMetadata());
    }

    public QCommute(PathMetadata metadata) {
        super(Commute.class, metadata);
    }

}