package com.company.project.domain.meeting;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QMeetingReservation is a Querydsl query type for MeetingReservation
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QMeetingReservation extends EntityPathBase<MeetingReservation> {

    private static final long serialVersionUID = -2018872389L;

    public static final QMeetingReservation meetingReservation = new QMeetingReservation("meetingReservation");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final NumberPath<Integer> atndncNmpr = createNumber("atndncNmpr", Integer.class);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath mtgCn = createString("mtgCn");

    public final StringPath mtgPlaceId = createString("mtgPlaceId");

    public final StringPath mtgSj = createString("mtgSj");

    public final StringPath resveBeginTm = createString("resveBeginTm");

    public final StringPath resveDe = createString("resveDe");

    public final StringPath resveEndTm = createString("resveEndTm");

    public final StringPath resveId = createString("resveId");

    public final StringPath resveManId = createString("resveManId");

    public QMeetingReservation(String variable) {
        super(MeetingReservation.class, forVariable(variable));
    }

    public QMeetingReservation(Path<? extends MeetingReservation> path) {
        super(path.getType(), path.getMetadata());
    }

    public QMeetingReservation(PathMetadata metadata) {
        super(MeetingReservation.class, metadata);
    }

}
