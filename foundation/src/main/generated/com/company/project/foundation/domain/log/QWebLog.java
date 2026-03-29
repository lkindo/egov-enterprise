package com.company.project.foundation.domain.log;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QWebLog is a Querydsl query type for WebLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QWebLog extends EntityPathBase<WebLog> {

    private static final long serialVersionUID = -1025628900L;

    public static final QWebLog webLog = new QWebLog("webLog");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final DateTimePath<java.time.LocalDateTime> occrrncDe = createDateTime("occrrncDe", java.time.LocalDateTime.class);

    public final StringPath requstId = createString("requstId");

    public final StringPath rqesterId = createString("rqesterId");

    public final StringPath rqesterIp = createString("rqesterIp");

    public final StringPath url = createString("url");

    public QWebLog(String variable) {
        super(WebLog.class, forVariable(variable));
    }

    public QWebLog(Path<? extends WebLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QWebLog(PathMetadata metadata) {
        super(WebLog.class, metadata);
    }

}

