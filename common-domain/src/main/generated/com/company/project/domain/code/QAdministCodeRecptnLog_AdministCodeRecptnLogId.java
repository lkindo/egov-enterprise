package com.company.project.domain.code;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QAdministCodeRecptnLog_AdministCodeRecptnLogId is a Querydsl query type for AdministCodeRecptnLogId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QAdministCodeRecptnLog_AdministCodeRecptnLogId extends BeanPath<AdministCodeRecptnLog.AdministCodeRecptnLogId> {

    private static final long serialVersionUID = 858667463L;

    public static final QAdministCodeRecptnLog_AdministCodeRecptnLogId administCodeRecptnLogId = new QAdministCodeRecptnLog_AdministCodeRecptnLogId("administCodeRecptnLogId");

    public final StringPath administZoneCode = createString("administZoneCode");

    public final StringPath administZoneSe = createString("administZoneSe");

    public final StringPath occrrncDe = createString("occrrncDe");

    public final NumberPath<Long> opertSn = createNumber("opertSn", Long.class);

    public QAdministCodeRecptnLog_AdministCodeRecptnLogId(String variable) {
        super(AdministCodeRecptnLog.AdministCodeRecptnLogId.class, forVariable(variable));
    }

    public QAdministCodeRecptnLog_AdministCodeRecptnLogId(Path<? extends AdministCodeRecptnLog.AdministCodeRecptnLogId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QAdministCodeRecptnLog_AdministCodeRecptnLogId(PathMetadata metadata) {
        super(AdministCodeRecptnLog.AdministCodeRecptnLogId.class, metadata);
    }

}

