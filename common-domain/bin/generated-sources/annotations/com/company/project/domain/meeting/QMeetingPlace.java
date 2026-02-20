package com.company.project.domain.meeting;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QMeetingPlace is a Querydsl query type for MeetingPlace
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QMeetingPlace extends EntityPathBase<MeetingPlace> {

    private static final long serialVersionUID = 1058302006L;

    public static final QMeetingPlace meetingPlace = new QMeetingPlace("meetingPlace");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final NumberPath<Integer> aceptncPosblNmpr = createNumber("aceptncPosblNmpr", Integer.class);

    public final StringPath atchFileId = createString("atchFileId");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath lcDetail = createString("lcDetail");

    public final StringPath lcSe = createString("lcSe");

    public final StringPath mtgPlaceId = createString("mtgPlaceId");

    public final StringPath mtgPlaceNm = createString("mtgPlaceNm");

    public final StringPath opnBeginTm = createString("opnBeginTm");

    public final StringPath opnEndTm = createString("opnEndTm");

    public QMeetingPlace(String variable) {
        super(MeetingPlace.class, forVariable(variable));
    }

    public QMeetingPlace(Path<? extends MeetingPlace> path) {
        super(path.getType(), path.getMetadata());
    }

    public QMeetingPlace(PathMetadata metadata) {
        super(MeetingPlace.class, metadata);
    }

}

