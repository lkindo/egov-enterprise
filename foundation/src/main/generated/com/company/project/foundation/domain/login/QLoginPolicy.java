package com.company.project.foundation.domain.login;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QLoginPolicy is a Querydsl query type for LoginPolicy
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QLoginPolicy extends EntityPathBase<LoginPolicy> {

    private static final long serialVersionUID = -1241928492L;

    public static final QLoginPolicy loginPolicy = new QLoginPolicy("loginPolicy");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath dplctPermAt = createString("dplctPermAt");

    public final StringPath emplyrId = createString("emplyrId");

    public final StringPath ipInfo = createString("ipInfo");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath lmttAt = createString("lmttAt");

    public QLoginPolicy(String variable) {
        super(LoginPolicy.class, forVariable(variable));
    }

    public QLoginPolicy(Path<? extends LoginPolicy> path) {
        super(path.getType(), path.getMetadata());
    }

    public QLoginPolicy(PathMetadata metadata) {
        super(LoginPolicy.class, metadata);
    }

}

