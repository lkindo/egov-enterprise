package com.company.project.domain.event;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QEventAttendance is a Querydsl query type for EventAttendance
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QEventAttendance extends EntityPathBase<EventAttendance> {

    private static final long serialVersionUID = -158395176L;

    public static final QEventAttendance eventAttendance = new QEventAttendance("eventAttendance");

    public final StringPath applcntId = createString("applcntId");

    public final StringPath confmAt = createString("confmAt");

    public final StringPath eventId = createString("eventId");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath infrmlSanctnId = createString("infrmlSanctnId");

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath reqstDe = createString("reqstDe");

    public final StringPath returnResn = createString("returnResn");

    public final DateTimePath<java.time.LocalDateTime> sanctnDt = createDateTime("sanctnDt", java.time.LocalDateTime.class);

    public final StringPath sanctnerId = createString("sanctnerId");

    public QEventAttendance(String variable) {
        super(EventAttendance.class, forVariable(variable));
    }

    public QEventAttendance(Path<? extends EventAttendance> path) {
        super(path.getType(), path.getMetadata());
    }

    public QEventAttendance(PathMetadata metadata) {
        super(EventAttendance.class, metadata);
    }

}