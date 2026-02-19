package com.company.project.domain.integration;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QTransmitReceiveLog is a Querydsl query type for TransmitReceiveLog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QTransmitReceiveLog extends EntityPathBase<TransmitReceiveLog> {

    private static final long serialVersionUID = -1428180574L;

    public static final QTransmitReceiveLog transmitReceiveLog = new QTransmitReceiveLog("transmitReceiveLog");

    public final StringPath cntcId = createString("cntcId");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final StringPath occurrenceDe = createString("occurrenceDe");

    public final StringPath provdInsttId = createString("provdInsttId");

    public final StringPath provdSvcId = createString("provdSvcId");

    public final StringPath provdSysId = createString("provdSysId");

    public final StringPath requestId = createString("requestId");

    public final StringPath requestRecvTm = createString("requestRecvTm");

    public final StringPath requestTransmitTm = createString("requestTransmitTm");

    public final StringPath requstInsttId = createString("requstInsttId");

    public final StringPath requstSysId = createString("requstSysId");

    public final StringPath responseRecvTm = createString("responseRecvTm");

    public final StringPath responseTransmitTm = createString("responseTransmitTm");

    public final StringPath resultCode = createString("resultCode");

    public final StringPath resultMessage = createString("resultMessage");

    public final StringPath transmitReceiveSeCode = createString("transmitReceiveSeCode");

    public QTransmitReceiveLog(String variable) {
        super(TransmitReceiveLog.class, forVariable(variable));
    }

    public QTransmitReceiveLog(Path<? extends TransmitReceiveLog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QTransmitReceiveLog(PathMetadata metadata) {
        super(TransmitReceiveLog.class, metadata);
    }

}

