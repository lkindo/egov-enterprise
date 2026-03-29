package com.company.project.foundation.domain.system.policy;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QSystemPolicy is a Querydsl query type for SystemPolicy
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSystemPolicy extends EntityPathBase<SystemPolicy> {

    private static final long serialVersionUID = -420609760L;

    public static final QSystemPolicy systemPolicy = new QSystemPolicy("systemPolicy");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final StringPath content = createString("content");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath policyType = createString("policyType");

    public final StringPath title = createString("title");

    public QSystemPolicy(String variable) {
        super(SystemPolicy.class, forVariable(variable));
    }

    public QSystemPolicy(Path<? extends SystemPolicy> path) {
        super(path.getType(), path.getMetadata());
    }

    public QSystemPolicy(PathMetadata metadata) {
        super(SystemPolicy.class, metadata);
    }

}

