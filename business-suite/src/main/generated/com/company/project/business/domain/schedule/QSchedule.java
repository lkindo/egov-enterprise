package com.company.project.business.domain.schedule;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QSchedule is a Querydsl query type for Schedule
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSchedule extends EntityPathBase<Schedule> {

    private static final long serialVersionUID = -821402881L;

    public static final QSchedule schedule = new QSchedule("schedule");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final StringPath atchFileId = createString("atchFileId");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath reptitSeCode = createString("reptitSeCode");

    public final StringPath schdulBgnde = createString("schdulBgnde");

    public final StringPath schdulChargerId = createString("schdulChargerId");

    public final StringPath schdulCn = createString("schdulCn");

    public final StringPath schdulDeptId = createString("schdulDeptId");

    public final StringPath schdulEndde = createString("schdulEndde");

    public final StringPath schdulId = createString("schdulId");

    public final StringPath schdulIpcrCode = createString("schdulIpcrCode");

    public final StringPath schdulKindCode = createString("schdulKindCode");

    public final StringPath schdulNm = createString("schdulNm");

    public final StringPath schdulPlace = createString("schdulPlace");

    public final StringPath schdulSe = createString("schdulSe");

    public QSchedule(String variable) {
        super(Schedule.class, forVariable(variable));
    }

    public QSchedule(Path<? extends Schedule> path) {
        super(path.getType(), path.getMetadata());
    }

    public QSchedule(PathMetadata metadata) {
        super(Schedule.class, metadata);
    }

}

