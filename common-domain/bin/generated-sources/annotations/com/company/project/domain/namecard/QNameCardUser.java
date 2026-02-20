package com.company.project.domain.namecard;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QNameCardUser is a Querydsl query type for NameCardUser
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QNameCardUser extends EntityPathBase<NameCardUser> {

    private static final long serialVersionUID = -956282654L;

    public static final QNameCardUser nameCardUser = new QNameCardUser("nameCardUser");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath emplyrId = createString("emplyrId");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath ncrdId = createString("ncrdId");

    public final StringPath registSeCode = createString("registSeCode");

    public final StringPath useAt = createString("useAt");

    public QNameCardUser(String variable) {
        super(NameCardUser.class, forVariable(variable));
    }

    public QNameCardUser(Path<? extends NameCardUser> path) {
        super(path.getType(), path.getMetadata());
    }

    public QNameCardUser(PathMetadata metadata) {
        super(NameCardUser.class, metadata);
    }

}

