package com.company.project.domain.help;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QOnlineManual is a Querydsl query type for OnlineManual
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QOnlineManual extends EntityPathBase<OnlineManual> {

    private static final long serialVersionUID = -637483697L;

    public static final QOnlineManual onlineManual = new QOnlineManual("onlineManual");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath onlineMnlDc = createString("onlineMnlDc");

    public final StringPath onlineMnlDf = createString("onlineMnlDf");

    public final StringPath onlineMnlId = createString("onlineMnlId");

    public final StringPath onlineMnlNm = createString("onlineMnlNm");

    public final StringPath onlineMnlSeCode = createString("onlineMnlSeCode");

    public QOnlineManual(String variable) {
        super(OnlineManual.class, forVariable(variable));
    }

    public QOnlineManual(Path<? extends OnlineManual> path) {
        super(path.getType(), path.getMetadata());
    }

    public QOnlineManual(PathMetadata metadata) {
        super(OnlineManual.class, metadata);
    }

}
