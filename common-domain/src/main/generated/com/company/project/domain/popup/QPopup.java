package com.company.project.domain.popup;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QPopup is a Querydsl query type for Popup
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QPopup extends EntityPathBase<Popup> {

    private static final long serialVersionUID = 1530536755L;

    public static final QPopup popup = new QPopup("popup");

    public final StringPath fileUrl = createString("fileUrl");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath ntceAt = createString("ntceAt");

    public final StringPath ntceBgnde = createString("ntceBgnde");

    public final StringPath ntceEndde = createString("ntceEndde");

    public final StringPath popupHlc = createString("popupHlc");

    public final StringPath popupHSize = createString("popupHSize");

    public final StringPath popupId = createString("popupId");

    public final StringPath popupTitleNm = createString("popupTitleNm");

    public final StringPath popupWlc = createString("popupWlc");

    public final StringPath popupWSize = createString("popupWSize");

    public final StringPath stopVewAt = createString("stopVewAt");

    public QPopup(String variable) {
        super(Popup.class, forVariable(variable));
    }

    public QPopup(Path<? extends Popup> path) {
        super(path.getType(), path.getMetadata());
    }

    public QPopup(PathMetadata metadata) {
        super(Popup.class, metadata);
    }

}