package com.company.project.domain.log;

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

    private static final long serialVersionUID = -2048933423L;

    public static final QWebLog webLog = new QWebLog("webLog");

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

