package com.company.project.domain.notification;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QNotificationInf is a Querydsl query type for NotificationInf
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QNotificationInf extends EntityPathBase<NotificationInf> {

    private static final long serialVersionUID = -1213113206L;

    public static final QNotificationInf notificationInf = new QNotificationInf("notificationInf");

    public final StringPath bhNtcnIntrvl = createString("bhNtcnIntrvl");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath ntcnCn = createString("ntcnCn");

    public final NumberPath<Long> ntcnNo = createNumber("ntcnNo", Long.class);

    public final StringPath ntcnSj = createString("ntcnSj");

    public final StringPath ntcnTm = createString("ntcnTm");

    public QNotificationInf(String variable) {
        super(NotificationInf.class, forVariable(variable));
    }

    public QNotificationInf(Path<? extends NotificationInf> path) {
        super(path.getType(), path.getMetadata());
    }

    public QNotificationInf(PathMetadata metadata) {
        super(NotificationInf.class, metadata);
    }

}
