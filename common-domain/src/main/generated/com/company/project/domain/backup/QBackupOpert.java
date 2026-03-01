package com.company.project.domain.backup;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QBackupOpert is a Querydsl query type for BackupOpert
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBackupOpert extends EntityPathBase<BackupOpert> {

    private static final long serialVersionUID = -1409746321L;

    public static final QBackupOpert backupOpert = new QBackupOpert("backupOpert");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath backupOpertId = createString("backupOpertId");

    public final StringPath backupOpertNm = createString("backupOpertNm");

    public final StringPath backupOrginlDrctry = createString("backupOrginlDrctry");

    public final StringPath backupStreDrctry = createString("backupStreDrctry");

    public final StringPath cmprsSe = createString("cmprsSe");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath executCycle = createString("executCycle");

    public final StringPath executSchdulDe = createString("executSchdulDe");

    public final ListPath<BackupSchdulDfk, QBackupSchdulDfk> executSchdulDfkSes = this.<BackupSchdulDfk, QBackupSchdulDfk>createList("executSchdulDfkSes", BackupSchdulDfk.class, QBackupSchdulDfk.class, PathInits.DIRECT2);

    public final StringPath executSchdulHour = createString("executSchdulHour");

    public final StringPath executSchdulMnt = createString("executSchdulMnt");

    public final StringPath executSchdulSecnd = createString("executSchdulSecnd");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath useAt = createString("useAt");

    public QBackupOpert(String variable) {
        super(BackupOpert.class, forVariable(variable));
    }

    public QBackupOpert(Path<? extends BackupOpert> path) {
        super(path.getType(), path.getMetadata());
    }

    public QBackupOpert(PathMetadata metadata) {
        super(BackupOpert.class, metadata);
    }

}
