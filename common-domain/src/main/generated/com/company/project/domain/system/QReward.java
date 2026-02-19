package com.company.project.domain.system;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QReward is a Querydsl query type for Reward
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QReward extends EntityPathBase<Reward> {

    private static final long serialVersionUID = 1357573143L;

    public static final QReward reward = new QReward("reward");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath confmAt = createString("confmAt");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath infrmlSanctnId = createString("infrmlSanctnId");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath pblenCn = createString("pblenCn");

    public final StringPath returnResn = createString("returnResn");

    public final StringPath rwardCd = createString("rwardCd");

    public final StringPath rwardDe = createString("rwardDe");

    public final StringPath rwardId = createString("rwardId");

    public final StringPath rwardManId = createString("rwardManId");

    public final StringPath rwardNm = createString("rwardNm");

    public final StringPath sanctnDt = createString("sanctnDt");

    public final StringPath sanctnerId = createString("sanctnerId");

    public QReward(String variable) {
        super(Reward.class, forVariable(variable));
    }

    public QReward(Path<? extends Reward> path) {
        super(path.getType(), path.getMetadata());
    }

    public QReward(PathMetadata metadata) {
        super(Reward.class, metadata);
    }

}

