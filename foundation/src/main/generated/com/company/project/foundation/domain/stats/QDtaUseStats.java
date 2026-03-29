package com.company.project.foundation.domain.stats;

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

    private static final long serialVersionUID = 1179633496L;

    public static final QDtaUseStats dtaUseStats = new QDtaUseStats("dtaUseStats");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath bbsId = createString("bbsId");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath dtaUseStatsId = createString("dtaUseStatsId");

    public final NumberPath<Integer> fileSn = createNumber("fileSn", Integer.class);

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

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

