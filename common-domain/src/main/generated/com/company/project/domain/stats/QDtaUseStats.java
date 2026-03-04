package com.company.project.domain.stats;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QDtaUseStats is a Querydsl query type for DtaUseStats
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QDtaUseStats extends EntityPathBase<DtaUseStats> {

    private static final long serialVersionUID = -105159421L;

    public static final QDtaUseStats dtaUseStats = new QDtaUseStats("dtaUseStats");

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath bbsId = createString("bbsId");

    public final StringPath dtaUseStatsId = createString("dtaUseStatsId");

    public final NumberPath<Integer> fileSn = createNumber("fileSn", Integer.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final NumberPath<Long> nttId = createNumber("nttId", Long.class);

    public QDtaUseStats(String variable) {
        super(DtaUseStats.class, forVariable(variable));
    }

    public QDtaUseStats(Path<? extends DtaUseStats> path) {
        super(path.getType(), path.getMetadata());
    }

    public QDtaUseStats(PathMetadata metadata) {
        super(DtaUseStats.class, metadata);
    }

}