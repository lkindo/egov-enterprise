package com.company.project.foundation.domain.user.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QUserAbsence is a Querydsl query type for UserAbsence
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QUserAbsence extends EntityPathBase<UserAbsence> {

    private static final long serialVersionUID = -675324728L;

    public static final QUserAbsence userAbsence = new QUserAbsence("userAbsence");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath emplyrId = createString("emplyrId");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath userAbsnceAt = createString("userAbsnceAt");

    public QUserAbsence(String variable) {
        super(UserAbsence.class, forVariable(variable));
    }

    public QUserAbsence(Path<? extends UserAbsence> path) {
        super(path.getType(), path.getMetadata());
    }

    public QUserAbsence(PathMetadata metadata) {
        super(UserAbsence.class, metadata);
    }

}

