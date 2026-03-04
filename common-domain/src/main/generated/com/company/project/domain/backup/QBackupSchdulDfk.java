package com.company.project.domain.backup;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;

/**
 * QBackupSchdulDfk is a Querydsl query type for BackupSchdulDfk
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBackupSchdulDfk extends EntityPathBase<BackupSchdulDfk> {

    private static final long serialVersionUID = 1253684303L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QBackupSchdulDfk backupSchdulDfk = new QBackupSchdulDfk("backupSchdulDfk");

    public final QBackupOpert backupOpert;

    public final QBackupSchdulDfkId id;

    public QBackupSchdulDfk(String variable) {
        this(BackupSchdulDfk.class, forVariable(variable), INITS);
    }

    public QBackupSchdulDfk(Path<? extends BackupSchdulDfk> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QBackupSchdulDfk(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QBackupSchdulDfk(PathMetadata metadata, PathInits inits) {
        this(BackupSchdulDfk.class, metadata, inits);
    }

    public QBackupSchdulDfk(Class<? extends BackupSchdulDfk> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.backupOpert = inits.isInitialized("backupOpert") ? new QBackupOpert(forProperty("backupOpert")) : null;
        this.id = inits.isInitialized("id") ? new QBackupSchdulDfkId(forProperty("id")) : null;
    }

}