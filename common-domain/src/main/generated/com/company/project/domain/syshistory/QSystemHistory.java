package com.company.project.domain.syshistory;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QSystemHistory is a Querydsl query type for SystemHistory
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSystemHistory extends EntityPathBase<SystemHistory> {

    private static final long serialVersionUID = -608423179L;

    public static final QSystemHistory systemHistory = new QSystemHistory("systemHistory");

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath histCn = createString("histCn");

    public final StringPath histId = createString("histId");

    public final StringPath histSeCode = createString("histSeCode");

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath sysNm = createString("sysNm");

    public QSystemHistory(String variable) {
        super(SystemHistory.class, forVariable(variable));
    }

    public QSystemHistory(Path<? extends SystemHistory> path) {
        super(path.getType(), path.getMetadata());
    }

    public QSystemHistory(PathMetadata metadata) {
        super(SystemHistory.class, metadata);
    }

}
