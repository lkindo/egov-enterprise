package com.company.project.domain.schedule;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QLeaderStatus is a Querydsl query type for LeaderStatus
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QLeaderStatus extends EntityPathBase<LeaderStatus> {

    private static final long serialVersionUID = -547244133L;

    public static final QLeaderStatus leaderStatus = new QLeaderStatus("leaderStatus");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath leaderId = createString("leaderId");

    public final StringPath leaderSttus = createString("leaderSttus");

    public QLeaderStatus(String variable) {
        super(LeaderStatus.class, forVariable(variable));
    }

    public QLeaderStatus(Path<? extends LeaderStatus> path) {
        super(path.getType(), path.getMetadata());
    }

    public QLeaderStatus(PathMetadata metadata) {
        super(LeaderStatus.class, metadata);
    }

}
