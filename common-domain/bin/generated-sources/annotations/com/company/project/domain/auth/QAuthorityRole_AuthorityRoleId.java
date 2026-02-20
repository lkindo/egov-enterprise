package com.company.project.domain.auth;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QAuthorityRole_AuthorityRoleId is a Querydsl query type for AuthorityRoleId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QAuthorityRole_AuthorityRoleId extends BeanPath<AuthorityRole.AuthorityRoleId> {

    private static final long serialVersionUID = 690426160L;

    public static final QAuthorityRole_AuthorityRoleId authorityRoleId = new QAuthorityRole_AuthorityRoleId("authorityRoleId");

    public final StringPath authorCode = createString("authorCode");

    public final StringPath roleCode = createString("roleCode");

    public QAuthorityRole_AuthorityRoleId(String variable) {
        super(AuthorityRole.AuthorityRoleId.class, forVariable(variable));
    }

    public QAuthorityRole_AuthorityRoleId(Path<? extends AuthorityRole.AuthorityRoleId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QAuthorityRole_AuthorityRoleId(PathMetadata metadata) {
        super(AuthorityRole.AuthorityRoleId.class, metadata);
    }

}

