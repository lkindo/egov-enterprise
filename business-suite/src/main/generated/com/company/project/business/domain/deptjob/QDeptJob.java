package com.company.project.business.domain.deptjob;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QDeptJob is a Querydsl query type for DeptJob
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QDeptJob extends EntityPathBase<DeptJob> {

    private static final long serialVersionUID = -188587629L;

    public static final QDeptJob deptJob = new QDeptJob("deptJob");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath chargerId = createString("chargerId");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath deptJobbxId = createString("deptJobbxId");

    public final StringPath deptJobCn = createString("deptJobCn");

    public final StringPath deptJobId = createString("deptJobId");

    public final StringPath deptJobNm = createString("deptJobNm");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath priort = createString("priort");

    public QDeptJob(String variable) {
        super(DeptJob.class, forVariable(variable));
    }

    public QDeptJob(Path<? extends DeptJob> path) {
        super(path.getType(), path.getMetadata());
    }

    public QDeptJob(PathMetadata metadata) {
        super(DeptJob.class, metadata);
    }

}

