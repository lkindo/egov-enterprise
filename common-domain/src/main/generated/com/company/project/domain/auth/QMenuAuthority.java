package com.company.project.domain.auth;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QMenuAuthority is a Querydsl query type for MenuAuthority
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QMenuAuthority extends EntityPathBase<MenuAuthority> {

    private static final long serialVersionUID = 1384063029L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QMenuAuthority menuAuthority = new QMenuAuthority("menuAuthority");

    public final QMenuAuthority_MenuAuthorityId id;

    public final StringPath mapngCreatId = createString("mapngCreatId");

    public QMenuAuthority(String variable) {
        this(MenuAuthority.class, forVariable(variable), INITS);
    }

    public QMenuAuthority(Path<? extends MenuAuthority> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QMenuAuthority(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QMenuAuthority(PathMetadata metadata, PathInits inits) {
        this(MenuAuthority.class, metadata, inits);
    }

    public QMenuAuthority(Class<? extends MenuAuthority> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.id = inits.isInitialized("id") ? new QMenuAuthority_MenuAuthorityId(forProperty("id")) : null;
    }

}
