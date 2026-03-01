package com.company.project.domain.survey;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QOnlinePollResult is a Querydsl query type for OnlinePollResult
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QOnlinePollResult extends EntityPathBase<OnlinePollResult> {

    private static final long serialVersionUID = -649312116L;

    public static final QOnlinePollResult onlinePollResult = new QOnlinePollResult("onlinePollResult");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath pollId = createString("pollId");

    public final StringPath pollIemId = createString("pollIemId");

    public final StringPath pollResultId = createString("pollResultId");

    public QOnlinePollResult(String variable) {
        super(OnlinePollResult.class, forVariable(variable));
    }

    public QOnlinePollResult(Path<? extends OnlinePollResult> path) {
        super(path.getType(), path.getMetadata());
    }

    public QOnlinePollResult(PathMetadata metadata) {
        super(OnlinePollResult.class, metadata);
    }

}
