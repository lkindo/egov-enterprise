package com.company.project.domain.system;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QEventAttendee is a Querydsl query type for EventAttendee
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QEventAttendee extends EntityPathBase<EventAttendee> {

    private static final long serialVersionUID = -1392445556L;

    public static final QEventAttendee eventAttendee = new QEventAttendee("eventAttendee");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath applcntId = createString("applcntId");

    public final StringPath confmAt = createString("confmAt");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath eventId = createString("eventId");

    public final StringPath infrmlSanctnId = createString("infrmlSanctnId");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath reqstDe = createString("reqstDe");

    public final StringPath returnResn = createString("returnResn");

    public final StringPath sanctnDt = createString("sanctnDt");

    public final StringPath sanctnerId = createString("sanctnerId");

    public QEventAttendee(String variable) {
        super(EventAttendee.class, forVariable(variable));
    }

    public QEventAttendee(Path<? extends EventAttendee> path) {
        super(path.getType(), path.getMetadata());
    }

    public QEventAttendee(PathMetadata metadata) {
        super(EventAttendee.class, metadata);
    }

}
