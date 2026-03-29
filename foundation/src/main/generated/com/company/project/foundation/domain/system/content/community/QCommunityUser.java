package com.company.project.foundation.domain.system.content.community;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QCommunityUser is a Querydsl query type for CommunityUser
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QCommunityUser extends EntityPathBase<CommunityUser> {

    private static final long serialVersionUID = 821615741L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QCommunityUser communityUser = new QCommunityUser("communityUser");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final QCommunityUserId id;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath mberSttus = createString("mberSttus");

    public final StringPath mngrAt = createString("mngrAt");

    public final DateTimePath<java.time.LocalDateTime> sbscrbDe = createDateTime("sbscrbDe", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> secsnDe = createDateTime("secsnDe", java.time.LocalDateTime.class);

    public final StringPath useAt = createString("useAt");

    public QCommunityUser(String variable) {
        this(CommunityUser.class, forVariable(variable), INITS);
    }

    public QCommunityUser(Path<? extends CommunityUser> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QCommunityUser(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QCommunityUser(PathMetadata metadata, PathInits inits) {
        this(CommunityUser.class, metadata, inits);
    }

    public QCommunityUser(Class<? extends CommunityUser> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.id = inits.isInitialized("id") ? new QCommunityUserId(forProperty("id")) : null;
    }

}

