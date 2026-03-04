package com.company.project.domain.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QFileSystemMonitoringLog is a Querydsl query type for FileSystemMonitoringLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QFileSystemMonitoringLog extends EntityPathBase<FileSystemMonitoringLog> {

    private static final long serialVersionUID = -862158718L;

    public static final QFileSystemMonitoringLog fileSystemMonitoringLog = new QFileSystemMonitoringLog("fileSystemMonitoringLog");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> createdDate = createDateTime("createdDate", java.time.LocalDateTime.class);

    public final StringPath fileSysId = createString("fileSysId");

    public final StringPath fileSysManageNm = createString("fileSysManageNm");

    public final StringPath fileSysNm = createString("fileSysNm");

    public final NumberPath<Long> fileSysSize = createNumber("fileSysSize", Long.class);

    public final NumberPath<Long> fileSysThrhld = createNumber("fileSysThrhld", Long.class);

    public final NumberPath<Long> fileSysUsgQty = createNumber("fileSysUsgQty", Long.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = createDateTime("lastModifiedDate", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath logId = createString("logId");

    public final StringPath logInfo = createString("logInfo");

    public final StringPath mntrngSttus = createString("mntrngSttus");

    public QFileSystemMonitoringLog(String variable) {
        super(FileSystemMonitoringLog.class, forVariable(variable));
    }

    public QFileSystemMonitoringLog(Path<? extends FileSystemMonitoringLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QFileSystemMonitoringLog(PathMetadata metadata) {
        super(FileSystemMonitoringLog.class, metadata);
    }

}