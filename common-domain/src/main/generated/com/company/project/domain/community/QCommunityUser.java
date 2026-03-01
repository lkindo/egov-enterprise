package com.company.project.domain.community;

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

    private static final long serialVersionUID = 1193779928L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QCommunityUser communityUser = new QCommunityUser("communityUser");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final QCommunityUserId id;

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

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
