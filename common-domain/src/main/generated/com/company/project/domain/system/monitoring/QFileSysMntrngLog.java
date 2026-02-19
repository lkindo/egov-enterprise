package com.company.project.domain.system.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QFileSysMntrngLog is a Querydsl query type for FileSysMntrngLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QFileSysMntrngLog extends EntityPathBase<FileSysMntrngLog> {

    private static final long serialVersionUID = 1847153369L;

    public static final QFileSysMntrngLog fileSysMntrngLog = new QFileSysMntrngLog("fileSysMntrngLog");

    public final DateTimePath<java.time.LocalDateTime> creatDt = createDateTime("creatDt", java.time.LocalDateTime.class);

    public final StringPath fileSysId = createString("fileSysId");

    public final StringPath fileSysManageNm = createString("fileSysManageNm");

    public final NumberPath<Long> fileSysMg = createNumber("fileSysMg", Long.class);

    public final StringPath fileSysNm = createString("fileSysNm");

    public final NumberPath<Long> fileSysThrhld = createNumber("fileSysThrhld", Long.class);

    public final NumberPath<Long> fileSysUsgQty = createNumber("fileSysUsgQty", Long.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath logId = createString("logId");

    public final StringPath logInfo = createString("logInfo");

    public final StringPath mntrngSttus = createString("mntrngSttus");

    public QFileSysMntrngLog(String variable) {
        super(FileSysMntrngLog.class, forVariable(variable));
    }

    public QFileSysMntrngLog(Path<? extends FileSysMntrngLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QFileSysMntrngLog(PathMetadata metadata) {
        super(FileSysMntrngLog.class, metadata);
    }

}

