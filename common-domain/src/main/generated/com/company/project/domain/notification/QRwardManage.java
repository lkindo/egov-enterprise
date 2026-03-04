package com.company.project.domain.notification;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QRwardManage is a Querydsl query type for RwardManage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QRwardManage extends EntityPathBase<RwardManage> {

    private static final long serialVersionUID = -973421433L;

    public static final QRwardManage rwardManage = new QRwardManage("rwardManage");

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath confmAt = createString("confmAt");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath infrmlSanctnId = createString("infrmlSanctnId");

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath pblenCn = createString("pblenCn");

    public final StringPath returnResn = createString("returnResn");

    public final StringPath rwardCode = createString("rwardCode");

    public final StringPath rwardDe = createString("rwardDe");

    public final StringPath rwardId = createString("rwardId");

    public final StringPath rwardNm = createString("rwardNm");

    public final StringPath rwardwnrId = createString("rwardwnrId");

    public final DateTimePath<java.time.LocalDateTime> sanctnDt = createDateTime("sanctnDt", java.time.LocalDateTime.class);

    public final StringPath sanctnerId = createString("sanctnerId");

    public QRwardManage(String variable) {
        super(RwardManage.class, forVariable(variable));
    }

    public QRwardManage(Path<? extends RwardManage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QRwardManage(PathMetadata metadata) {
        super(RwardManage.class, metadata);
    }

}