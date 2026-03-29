package com.company.project.foundation.domain.group;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QGroupManage is a Querydsl query type for GroupManage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QGroupManage extends EntityPathBase<GroupManage> {

    private static final long serialVersionUID = -492529229L;

    public static final QGroupManage groupManage = new QGroupManage("groupManage");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final DateTimePath<java.time.LocalDateTime> groupCreatDe = createDateTime("groupCreatDe", java.time.LocalDateTime.class);

    public final StringPath groupDc = createString("groupDc");

    public final StringPath groupId = createString("groupId");

    public final StringPath groupNm = createString("groupNm");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public QGroupManage(String variable) {
        super(GroupManage.class, forVariable(variable));
    }

    public QGroupManage(Path<? extends GroupManage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QGroupManage(PathMetadata metadata) {
        super(GroupManage.class, metadata);
    }

}

