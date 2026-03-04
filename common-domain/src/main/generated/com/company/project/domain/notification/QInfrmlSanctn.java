package com.company.project.domain.notification;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QInfrmlSanctn is a Querydsl query type for InfrmlSanctn
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QInfrmlSanctn extends EntityPathBase<InfrmlSanctn> {

    private static final long serialVersionUID = 867859289L;

    public static final QInfrmlSanctn infrmlSanctn = new QInfrmlSanctn("infrmlSanctn");

    public final StringPath applcntId = createString("applcntId");

    public final StringPath confmAt = createString("confmAt");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath infrmlSanctnId = createString("infrmlSanctnId");

    public final StringPath jobSeCode = createString("jobSeCode");

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath reqstDe = createString("reqstDe");

    public final StringPath returnResn = createString("returnResn");

    public final StringPath sanctnDt = createString("sanctnDt");

    public final StringPath sanctnerId = createString("sanctnerId");

    public QInfrmlSanctn(String variable) {
        super(InfrmlSanctn.class, forVariable(variable));
    }

    public QInfrmlSanctn(Path<? extends InfrmlSanctn> path) {
        super(path.getType(), path.getMetadata());
    }

    public QInfrmlSanctn(PathMetadata metadata) {
        super(InfrmlSanctn.class, metadata);
    }

}
