package com.company.project.domain.meeting;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QMeetingManage is a Querydsl query type for MeetingManage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QMeetingManage extends EntityPathBase<MeetingManage> {

    private static final long serialVersionUID = -1648036842L;

    public static final QMeetingManage meetingManage = new QMeetingManage("meetingManage");

    public final NumberPath<Integer> atdrnCo = createNumber("atdrnCo", Integer.class);

    public final StringPath clsdrMtgAt = createString("clsdrMtgAt");

    public final StringPath etcMatter = createString("etcMatter");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath mnaerDeptId = createString("mnaerDeptId");

    public final StringPath mnaerId = createString("mnaerId");

    public final StringPath mngtDeptId = createString("mngtDeptId");

    public final StringPath mtgAt = createString("mtgAt");

    public final StringPath mtgBeginTm = createString("mtgBeginTm");

    public final NumberPath<Integer> mtgCo = createNumber("mtgCo", Integer.class);

    public final StringPath mtgDe = createString("mtgDe");

    public final StringPath mtgEndTime = createString("mtgEndTime");

    public final StringPath mtgId = createString("mtgId");

    public final StringPath mtgMtrCn = createString("mtgMtrCn");

    public final StringPath mtgNm = createString("mtgNm");

    public final StringPath mtgPlace = createString("mtgPlace");

    public final StringPath mtgResultCn = createString("mtgResultCn");

    public final StringPath mtgResultEnnc = createString("mtgResultEnnc");

    public final NumberPath<Integer> mtgSn = createNumber("mtgSn", Integer.class);

    public final NumberPath<Integer> nonatdrnCo = createNumber("nonatdrnCo", Integer.class);

    public final StringPath readngAt = createString("readngAt");

    public final StringPath readngBgnde = createString("readngBgnde");

    public QMeetingManage(String variable) {
        super(MeetingManage.class, forVariable(variable));
    }

    public QMeetingManage(Path<? extends MeetingManage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QMeetingManage(PathMetadata metadata) {
        super(MeetingManage.class, metadata);
    }

}
