package com.company.project.domain.stats;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QReprtStats is a Querydsl query type for ReprtStats
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QReprtStats extends EntityPathBase<ReprtStats> {

    private static final long serialVersionUID = -2029274042L;

    public static final QReprtStats reprtStats = new QReprtStats("reprtStats");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath reprtId = createString("reprtId");

    public final StringPath reprtNm = createString("reprtNm");

    public final StringPath reprtSttus = createString("reprtSttus");

    public final StringPath reprtTy = createString("reprtTy");

    public QReprtStats(String variable) {
        super(ReprtStats.class, forVariable(variable));
    }

    public QReprtStats(Path<? extends ReprtStats> path) {
        super(path.getType(), path.getMetadata());
    }

    public QReprtStats(PathMetadata metadata) {
        super(ReprtStats.class, metadata);
    }

}
