package com.company.project.domain.auth;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QMenuAuthority_MenuAuthorityId is a Querydsl query type for MenuAuthorityId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QMenuAuthority_MenuAuthorityId extends BeanPath<MenuAuthority.MenuAuthorityId> {

    private static final long serialVersionUID = -1642739450L;

    public static final QMenuAuthority_MenuAuthorityId menuAuthorityId = new QMenuAuthority_MenuAuthorityId("menuAuthorityId");

    public final StringPath authorCode = createString("authorCode");

    public final NumberPath<Long> menuNo = createNumber("menuNo", Long.class);

    public QMenuAuthority_MenuAuthorityId(String variable) {
        super(MenuAuthority.MenuAuthorityId.class, forVariable(variable));
    }

    public QMenuAuthority_MenuAuthorityId(Path<? extends MenuAuthority.MenuAuthorityId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QMenuAuthority_MenuAuthorityId(PathMetadata metadata) {
        super(MenuAuthority.MenuAuthorityId.class, metadata);
    }

}

