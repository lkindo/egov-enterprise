package com.company.project.domain.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QFileSystemMonitoring is a Querydsl query type for FileSystemMonitoring
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QFileSystemMonitoring extends EntityPathBase<FileSystemMonitoring> {

    private static final long serialVersionUID = -902965406L;

    public static final QFileSystemMonitoring fileSystemMonitoring = new QFileSystemMonitoring("fileSystemMonitoring");

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

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath mntrngSttus = createString("mntrngSttus");

    public QFileSystemMonitoring(String variable) {
        super(FileSystemMonitoring.class, forVariable(variable));
    }

    public QFileSystemMonitoring(Path<? extends FileSystemMonitoring> path) {
        super(path.getType(), path.getMetadata());
    }

    public QFileSystemMonitoring(PathMetadata metadata) {
        super(FileSystemMonitoring.class, metadata);
    }

}
