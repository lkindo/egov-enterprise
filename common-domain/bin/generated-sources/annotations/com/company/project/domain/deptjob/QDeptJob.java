package com.company.project.domain.deptjob;

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

    private static final long serialVersionUID = 1893591147L;

    public static final QDeptJob deptJob = new QDeptJob("deptJob");

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath chargerId = createString("chargerId");

    public final StringPath deptJobbxId = createString("deptJobbxId");

    public final StringPath deptJobCn = createString("deptJobCn");

    public final StringPath deptJobId = createString("deptJobId");

    public final StringPath deptJobNm = createString("deptJobNm");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

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

