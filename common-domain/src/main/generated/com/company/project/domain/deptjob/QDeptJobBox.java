package com.company.project.domain.deptjob;

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

    private static final long serialVersionUID = 1873461600L;

    public static final QDeptJobBox deptJobBox = new QDeptJobBox("deptJobBox");

    public final StringPath deptId = createString("deptId");

    public final StringPath deptJobbxId = createString("deptJobbxId");

    public final StringPath deptJobbxNm = createString("deptJobbxNm");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final NumberPath<Integer> indictOrdr = createNumber("indictOrdr", Integer.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

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
