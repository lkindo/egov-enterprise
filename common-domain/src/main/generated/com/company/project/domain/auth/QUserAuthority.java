package com.company.project.domain.auth;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QUserAuthority is a Querydsl query type for UserAuthority
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QUserAuthority extends EntityPathBase<UserAuthority> {

    private static final long serialVersionUID = 426230601L;

    public static final QUserAuthority userAuthority = new QUserAuthority("userAuthority");

    public final StringPath authorCode = createString("authorCode");

    public final StringPath mberTyCode = createString("mberTyCode");

    public final StringPath uniqId = createString("uniqId");

    public QUserAuthority(String variable) {
        super(UserAuthority.class, forVariable(variable));
    }

    public QUserAuthority(Path<? extends UserAuthority> path) {
        super(path.getType(), path.getMetadata());
    }

    public QUserAuthority(PathMetadata metadata) {
        super(UserAuthority.class, metadata);
    }

}
