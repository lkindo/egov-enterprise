package com.company.project.domain.log;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QSysLog is a Querydsl query type for SysLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSysLog extends EntityPathBase<SysLog> {

    private static final long serialVersionUID = -2144473160L;

    public static final QSysLog sysLog = new QSysLog("sysLog");

    public final StringPath errorCode = createString("errorCode");

    public final StringPath errorSe = createString("errorSe");

    public final StringPath methodNm = createString("methodNm");

    public final StringPath occrrncDe = createString("occrrncDe");

    public final StringPath processSeCode = createString("processSeCode");

    public final StringPath processTime = createString("processTime");

    public final StringPath requstId = createString("requstId");

    public final StringPath rqesterId = createString("rqesterId");

    public final StringPath rqesterIp = createString("rqesterIp");

    public final StringPath rspnsCode = createString("rspnsCode");

    public final StringPath srvcNm = createString("srvcNm");

    public QSysLog(String variable) {
        super(SysLog.class, forVariable(variable));
    }

    public QSysLog(Path<? extends SysLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QSysLog(PathMetadata metadata) {
        super(SysLog.class, metadata);
    }

}