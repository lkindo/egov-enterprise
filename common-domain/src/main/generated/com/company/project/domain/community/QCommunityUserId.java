package com.company.project.domain.community;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QCommunityUserId is a Querydsl query type for CommunityUserId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QCommunityUserId extends BeanPath<CommunityUserId> {

    private static final long serialVersionUID = 466245139L;

    public static final QCommunityUserId communityUserId = new QCommunityUserId("communityUserId");

    public final StringPath cmmntyId = createString("cmmntyId");

    public final StringPath emplyrId = createString("emplyrId");

    public QCommunityUserId(String variable) {
        super(CommunityUserId.class, forVariable(variable));
    }

    public QCommunityUserId(Path<? extends CommunityUserId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QCommunityUserId(PathMetadata metadata) {
        super(CommunityUserId.class, metadata);
    }

}