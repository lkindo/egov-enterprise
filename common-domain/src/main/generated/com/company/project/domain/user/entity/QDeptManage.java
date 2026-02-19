package com.company.project.domain.user.entity;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QDeptManage is a Querydsl query type for DeptManage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QDeptManage extends EntityPathBase<DeptManage> {

    private static final long serialVersionUID = -1662924375L;

    public static final QDeptManage deptManage = new QDeptManage("deptManage");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

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

    public QDeptManage(String variable) {
        super(DeptManage.class, forVariable(variable));
    }

    public QDeptManage(Path<? extends DeptManage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QDeptManage(PathMetadata metadata) {
        super(DeptManage.class, metadata);
    }

}

