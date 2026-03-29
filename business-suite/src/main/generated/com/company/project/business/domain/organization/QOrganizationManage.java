package com.company.project.business.domain.organization;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QOrganizationManage is a Querydsl query type for OrganizationManage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QOrganizationManage extends EntityPathBase<OrganizationManage> {

    private static final long serialVersionUID = 77974084L;

    public static final QOrganizationManage organizationManage = new QOrganizationManage("organizationManage");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath orgnztDc = createString("orgnztDc");

    public final StringPath orgnztId = createString("orgnztId");

    public final StringPath orgnztNm = createString("orgnztNm");

    public QOrganizationManage(String variable) {
        super(OrganizationManage.class, forVariable(variable));
    }

    public QOrganizationManage(Path<? extends OrganizationManage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QOrganizationManage(PathMetadata metadata) {
        super(OrganizationManage.class, metadata);
    }

}

