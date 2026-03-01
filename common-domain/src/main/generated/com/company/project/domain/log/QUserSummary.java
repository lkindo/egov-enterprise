package com.company.project.domain.log;

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

    private static final long serialVersionUID = -1194139782L;

    public static final QUserSummary userSummary = new QUserSummary("userSummary");

    public final StringPath detailStatsKind = createString("detailStatsKind");

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
