package com.company.project.domain.log;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QSysHistory is a Querydsl query type for SysHistory
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSysHistory extends EntityPathBase<SysHistory> {

    private static final long serialVersionUID = -154609912L;

    public static final QSysHistory sysHistory = new QSysHistory("sysHistory");

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath histCn = createString("histCn");

    public final StringPath histId = createString("histId");

    public final StringPath histSeCode = createString("histSeCode");

    public final StringPath sysNm = createString("sysNm");

    public QSysHistory(String variable) {
        super(SysHistory.class, forVariable(variable));
    }

    public QSysHistory(Path<? extends SysHistory> path) {
        super(path.getType(), path.getMetadata());
    }

    public QSysHistory(PathMetadata metadata) {
        super(SysHistory.class, metadata);
    }

}

