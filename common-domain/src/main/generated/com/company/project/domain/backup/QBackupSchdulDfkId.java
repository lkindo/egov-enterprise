package com.company.project.domain.backup;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QBackupSchdulDfkId is a Querydsl query type for BackupSchdulDfkId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QBackupSchdulDfkId extends BeanPath<BackupSchdulDfkId> {

    private static final long serialVersionUID = -2095192630L;

    public static final QBackupSchdulDfkId backupSchdulDfkId = new QBackupSchdulDfkId("backupSchdulDfkId");

    public final StringPath backupOpertId = createString("backupOpertId");

    public final StringPath executSchdulDfkSe = createString("executSchdulDfkSe");

    public QBackupSchdulDfkId(String variable) {
        super(BackupSchdulDfkId.class, forVariable(variable));
    }

    public QBackupSchdulDfkId(Path<? extends BackupSchdulDfkId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QBackupSchdulDfkId(PathMetadata metadata) {
        super(BackupSchdulDfkId.class, metadata);
    }

}