package com.company.project.domain.notification;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QVcatnManage is a Querydsl query type for VcatnManage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QVcatnManage extends EntityPathBase<VcatnManage> {

    private static final long serialVersionUID = -460233881L;

    public static final QVcatnManage vcatnManage = new QVcatnManage("vcatnManage");

    public final StringPath applcntId = createString("applcntId");

    public final StringPath bgnde = createString("bgnde");

    public final StringPath confmAt = createString("confmAt");

    public final StringPath endde = createString("endde");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath infrmlSanctnId = createString("infrmlSanctnId");

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath noonSe = createString("noonSe");

    public final StringPath occrrncYear = createString("occrrncYear");

    public final StringPath reqstDe = createString("reqstDe");

    public final StringPath returnResn = createString("returnResn");

    public final DateTimePath<java.time.LocalDateTime> sanctnDt = createDateTime("sanctnDt", java.time.LocalDateTime.class);

    public final StringPath sanctnerId = createString("sanctnerId");

    public final StringPath vcatnResn = createString("vcatnResn");

    public final StringPath vcatnSe = createString("vcatnSe");

    public QVcatnManage(String variable) {
        super(VcatnManage.class, forVariable(variable));
    }

    public QVcatnManage(Path<? extends VcatnManage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QVcatnManage(PathMetadata metadata) {
        super(VcatnManage.class, metadata);
    }

}

