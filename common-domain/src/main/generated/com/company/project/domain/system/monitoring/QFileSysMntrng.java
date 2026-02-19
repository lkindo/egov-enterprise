package com.company.project.domain.system.monitoring;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QFileSysMntrng is a Querydsl query type for FileSysMntrng
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QFileSysMntrng extends EntityPathBase<FileSysMntrng> {

    private static final long serialVersionUID = 1390869611L;

    public static final QFileSysMntrng fileSysMntrng = new QFileSysMntrng("fileSysMntrng");

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

    public final StringPath mngrEmailAddr = createString("mngrEmailAddr");

    public final StringPath mngrNm = createString("mngrNm");

    public final StringPath mntrngSttus = createString("mntrngSttus");

    public QFileSysMntrng(String variable) {
        super(FileSysMntrng.class, forVariable(variable));
    }

    public QFileSysMntrng(Path<? extends FileSysMntrng> path) {
        super(path.getType(), path.getMetadata());
    }

    public QFileSysMntrng(PathMetadata metadata) {
        super(FileSysMntrng.class, metadata);
    }

}

