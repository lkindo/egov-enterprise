package com.company.project.domain.user.entity;

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

    private static final long serialVersionUID = 1287445979L;

    public static final QCommute commute = new QCommute("commute");

    public final com.company.project.domain.common.QBaseTimeEntity _super = new com.company.project.domain.common.QBaseTimeEntity(this);

    public final StringPath commuteId = createString("commuteId");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath endStatus = createString("endStatus");

    public final StringPath endTime = createString("endTime");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath overtimeHours = createString("overtimeHours");

    public final StringPath startStatus = createString("startStatus");

    public final StringPath startTime = createString("startTime");

    public final StringPath userId = createString("userId");

    public final StringPath workHours = createString("workHours");

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
