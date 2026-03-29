package com.company.project.business.domain.deptjob;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QDeptJobBox is a Querydsl query type for DeptJobBox
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QDeptJobBox extends EntityPathBase<DeptJobBox> {

    private static final long serialVersionUID = -396765384L;

    public static final QDeptJobBox deptJobBox = new QDeptJobBox("deptJobBox");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath deptId = createString("deptId");

    public final StringPath deptJobbxId = createString("deptJobbxId");

    public final StringPath deptJobbxNm = createString("deptJobbxNm");

    public final NumberPath<Integer> indictOrdr = createNumber("indictOrdr", Integer.class);

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public QDeptJobBox(String variable) {
        super(DeptJobBox.class, forVariable(variable));
    }

    public QDeptJobBox(Path<? extends DeptJobBox> path) {
        super(path.getType(), path.getMetadata());
    }

    public QDeptJobBox(PathMetadata metadata) {
        super(DeptJobBox.class, metadata);
    }

}

