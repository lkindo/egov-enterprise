package com.company.project.foundation.domain.log;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QUserSummary is a Querydsl query type for UserSummary
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QUserSummary extends EntityPathBase<UserSummary> {

    private static final long serialVersionUID = 1515574031L;

    public static final QUserSummary userSummary = new QUserSummary("userSummary");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath detailStatsKind = createString("detailStatsKind");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath occrrncDe = createString("occrrncDe");

    public final StringPath statsKind = createString("statsKind");

    public final NumberPath<Long> userCo = createNumber("userCo", Long.class);

    public QUserSummary(String variable) {
        super(UserSummary.class, forVariable(variable));
    }

    public QUserSummary(Path<? extends UserSummary> path) {
        super(path.getType(), path.getMetadata());
    }

    public QUserSummary(PathMetadata metadata) {
        super(UserSummary.class, metadata);
    }

}

