package com.company.project.domain.backup;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QBackupResult is a Querydsl query type for BackupResult
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBackupResult extends EntityPathBase<BackupResult> {

    private static final long serialVersionUID = -676314444L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QBackupResult backupResult = new QBackupResult("backupResult");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath backupFile = createString("backupFile");

    public final QBackupOpert backupOpert;

    public final StringPath backupResultId = createString("backupResultId");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath errorInfo = createString("errorInfo");

    public final StringPath executBeginTime = createString("executBeginTime");

    public final StringPath executEndTime = createString("executEndTime");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath sttus = createString("sttus");

    public QBackupResult(String variable) {
        this(BackupResult.class, forVariable(variable), INITS);
    }

    public QBackupResult(Path<? extends BackupResult> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QBackupResult(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QBackupResult(PathMetadata metadata, PathInits inits) {
        this(BackupResult.class, metadata, inits);
    }

    public QBackupResult(Class<? extends BackupResult> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.backupOpert = inits.isInitialized("backupOpert") ? new QBackupOpert(forProperty("backupOpert")) : null;
    }

}
