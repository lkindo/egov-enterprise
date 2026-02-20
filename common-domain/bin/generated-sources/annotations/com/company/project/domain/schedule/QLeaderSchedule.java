package com.company.project.domain.schedule;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QLeaderSchedule is a Querydsl query type for LeaderSchedule
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QLeaderSchedule extends EntityPathBase<LeaderSchedule> {

    private static final long serialVersionUID = 362755072L;

    public static final QLeaderSchedule leaderSchedule = new QLeaderSchedule("leaderSchedule");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath beginDate = createString("beginDate");

    public final StringPath chargerId = createString("chargerId");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath endDate = createString("endDate");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath leaderId = createString("leaderId");

    public final StringPath reptitSeCode = createString("reptitSeCode");

    public final StringPath scheduleCn = createString("scheduleCn");

    public final StringPath scheduleId = createString("scheduleId");

    public final StringPath scheduleIpcrCode = createString("scheduleIpcrCode");

    public final StringPath scheduleNm = createString("scheduleNm");

    public final StringPath schedulePlace = createString("schedulePlace");

    public final StringPath scheduleSe = createString("scheduleSe");

    public QLeaderSchedule(String variable) {
        super(LeaderSchedule.class, forVariable(variable));
    }

    public QLeaderSchedule(Path<? extends LeaderSchedule> path) {
        super(path.getType(), path.getMetadata());
    }

    public QLeaderSchedule(PathMetadata metadata) {
        super(LeaderSchedule.class, metadata);
    }

}

