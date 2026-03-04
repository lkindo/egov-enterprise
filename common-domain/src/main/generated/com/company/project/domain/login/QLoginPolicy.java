package com.company.project.domain.login;

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

    private static final long serialVersionUID = 1768245887L;

    public static final QLoginPolicy loginPolicy = new QLoginPolicy("loginPolicy");

    public final StringPath dplctPermAt = createString("dplctPermAt");

    public final StringPath emplyrId = createString("emplyrId");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final StringPath ipInfo = createString("ipInfo");

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

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