package com.company.project.foundation.domain.operation;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QRewardManage is a Querydsl query type for RewardManage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QRewardManage extends EntityPathBase<RewardManage> {

    private static final long serialVersionUID = 591186813L;

    public static final QRewardManage rewardManage = new QRewardManage("rewardManage");

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath confmAt = createString("confmAt");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final StringPath informlSanctnId = createString("informlSanctnId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath pblenCn = createString("pblenCn");

    public final StringPath returnResn = createString("returnResn");

    public final StringPath rwardCode = createString("rwardCode");

    public final StringPath rwardDe = createString("rwardDe");

    public final StringPath rwardId = createString("rwardId");

    public final StringPath rwardNm = createString("rwardNm");

    public final StringPath rwardwnrId = createString("rwardwnrId");

    public final DateTimePath<java.time.LocalDateTime> sanctnDt = createDateTime("sanctnDt", java.time.LocalDateTime.class);

    public final StringPath sanctnerId = createString("sanctnerId");

    public QRewardManage(String variable) {
        super(RewardManage.class, forVariable(variable));
    }

    public QRewardManage(Path<? extends RewardManage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QRewardManage(PathMetadata metadata) {
        super(RewardManage.class, metadata);
    }

}

