package com.company.project.foundation.domain.system.content.popup;

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

    private static final long serialVersionUID = 1694559320L;

    public static final QPopup popup = new QPopup("popup");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath fileUrl = createString("fileUrl");

    public final StringPath isNotice = createString("isNotice");

    public final StringPath isStopView = createString("isStopView");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath noticeBeginDate = createString("noticeBeginDate");

    public final StringPath noticeEndDate = createString("noticeEndDate");

    public final StringPath popupHeightLocation = createString("popupHeightLocation");

    public final StringPath popupHeightSize = createString("popupHeightSize");

    public final StringPath popupId = createString("popupId");

    public final StringPath popupTitleName = createString("popupTitleName");

    public final StringPath popupWidthLocation = createString("popupWidthLocation");

    public final StringPath popupWidthSize = createString("popupWidthSize");

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

