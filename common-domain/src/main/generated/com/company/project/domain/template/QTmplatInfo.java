package com.company.project.domain.template;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QTmplatInfo is a Querydsl query type for TmplatInfo
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QTmplatInfo extends EntityPathBase<TmplatInfo> {

    private static final long serialVersionUID = 1021064563L;

    public static final QTmplatInfo tmplatInfo = new QTmplatInfo("tmplatInfo");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath tmplatCours = createString("tmplatCours");

    public final StringPath tmplatId = createString("tmplatId");

    public final StringPath tmplatNm = createString("tmplatNm");

    public final StringPath tmplatSeCode = createString("tmplatSeCode");

    public final StringPath useAt = createString("useAt");

    public QTmplatInfo(String variable) {
        super(TmplatInfo.class, forVariable(variable));
    }

    public QTmplatInfo(Path<? extends TmplatInfo> path) {
        super(path.getType(), path.getMetadata());
    }

    public QTmplatInfo(PathMetadata metadata) {
        super(TmplatInfo.class, metadata);
    }

}