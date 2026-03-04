package com.company.project.domain.reward;

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

    private static final long serialVersionUID = -617255145L;

    public static final QReward reward = new QReward("reward");

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath confmAt = createString("confmAt");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final StringPath infrmlSanctnId = createString("infrmlSanctnId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath pblenCn = createString("pblenCn");

    public final StringPath returnResn = createString("returnResn");

    public final StringPath rwardCode = createString("rwardCode");

    public final StringPath rwardDe = createString("rwardDe");

    public final StringPath rwardId = createString("rwardId");

    public final StringPath rwardManId = createString("rwardManId");

    public final StringPath rwardNm = createString("rwardNm");

    public final DateTimePath<java.time.LocalDateTime> sanctnDt = createDateTime("sanctnDt", java.time.LocalDateTime.class);

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