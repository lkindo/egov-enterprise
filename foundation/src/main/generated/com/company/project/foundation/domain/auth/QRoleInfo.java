package com.company.project.foundation.domain.auth;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QRoleInfo is a Querydsl query type for RoleInfo
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QRoleInfo extends EntityPathBase<RoleInfo> {

    private static final long serialVersionUID = 1091623144L;

    public static final QRoleInfo roleInfo = new QRoleInfo("roleInfo");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final StringPath creatDt = createString("creatDt");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath roleCode = createString("roleCode");

    public final StringPath roleDc = createString("roleDc");

    public final StringPath roleNm = createString("roleNm");

    public final StringPath rolePttrn = createString("rolePttrn");

    public final StringPath roleSort = createString("roleSort");

    public final StringPath roleTy = createString("roleTy");

    public QRoleInfo(String variable) {
        super(RoleInfo.class, forVariable(variable));
    }

    public QRoleInfo(Path<? extends RoleInfo> path) {
        super(path.getType(), path.getMetadata());
    }

    public QRoleInfo(PathMetadata metadata) {
        super(RoleInfo.class, metadata);
    }

}

