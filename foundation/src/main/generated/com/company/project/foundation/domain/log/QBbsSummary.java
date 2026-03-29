package com.company.project.foundation.domain.log;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QBbsSummary is a Querydsl query type for BbsSummary
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBbsSummary extends EntityPathBase<BbsSummary> {

    private static final long serialVersionUID = -889265217L;

    public static final QBbsSummary bbsSummary = new QBbsSummary("bbsSummary");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final NumberPath<Double> avrgInqireCo = createNumber("avrgInqireCo", Double.class);

    public final NumberPath<Long> creatCo = createNumber("creatCo", Long.class);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath detailStatsKind = createString("detailStatsKind");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath mummInqireBbsId = createString("mummInqireBbsId");

    public final StringPath mxmmInqireBbsId = createString("mxmmInqireBbsId");

    public final StringPath occrrncDe = createString("occrrncDe");

    public final StringPath statsKind = createString("statsKind");

    public final StringPath topNtcepersonId = createString("topNtcepersonId");

    public final NumberPath<Long> totInqireCo = createNumber("totInqireCo", Long.class);

    public QBbsSummary(String variable) {
        super(BbsSummary.class, forVariable(variable));
    }

    public QBbsSummary(Path<? extends BbsSummary> path) {
        super(path.getType(), path.getMetadata());
    }

    public QBbsSummary(PathMetadata metadata) {
        super(BbsSummary.class, metadata);
    }

}

