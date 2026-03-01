package com.company.project.domain.auth;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QAuthorityRole is a Querydsl query type for AuthorityRole
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QAuthorityRole extends EntityPathBase<AuthorityRole> {

    private static final long serialVersionUID = -254601750L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QAuthorityRole authorityRole = new QAuthorityRole("authorityRole");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final QAuthorityRole_AuthorityRoleId id;

    public QAuthorityRole(String variable) {
        this(AuthorityRole.class, forVariable(variable), INITS);
    }

    public QAuthorityRole(Path<? extends AuthorityRole> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QAuthorityRole(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QAuthorityRole(PathMetadata metadata, PathInits inits) {
        this(AuthorityRole.class, metadata, inits);
    }

    public QAuthorityRole(Class<? extends AuthorityRole> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.id = inits.isInitialized("id") ? new QAuthorityRole_AuthorityRoleId(forProperty("id")) : null;
    }

}
