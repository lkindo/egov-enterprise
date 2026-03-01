package com.company.project.domain.event;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QEvent is a Querydsl query type for Event
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QEvent extends EntityPathBase<Event> {

    private static final long serialVersionUID = 1079016591L;

    public static final QEvent event = new QEvent("event");

    public final StringPath ctOccrrncAt = createString("ctOccrrncAt");

    public final StringPath eventAuspcInsttNm = createString("eventAuspcInsttNm");

    public final StringPath eventBeginDe = createString("eventBeginDe");

    public final StringPath eventCn = createString("eventCn");

    public final StringPath eventEndDe = createString("eventEndDe");

    public final StringPath eventId = createString("eventId");

    public final StringPath eventMngtInsttNm = createString("eventMngtInsttNm");

    public final StringPath eventNm = createString("eventNm");

    public final StringPath eventPlace = createString("eventPlace");

    public final StringPath eventPurps = createString("eventPurps");

    public final StringPath eventSe = createString("eventSe");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final NumberPath<Integer> partcptCt = createNumber("partcptCt", Integer.class);

    public final NumberPath<Integer> psncpa = createNumber("psncpa", Integer.class);

    public final StringPath rceptBeginDe = createString("rceptBeginDe");

    public final StringPath rceptEndDe = createString("rceptEndDe");

    public final StringPath refrnUrl = createString("refrnUrl");

    public QEvent(String variable) {
        super(Event.class, forVariable(variable));
    }

    public QEvent(Path<? extends Event> path) {
        super(path.getType(), path.getMetadata());
    }

    public QEvent(PathMetadata metadata) {
        super(Event.class, metadata);
    }

}
