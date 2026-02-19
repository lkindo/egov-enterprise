package com.company.project.domain.code;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QAdministCode_AdministCodeId is a Querydsl query type for AdministCodeId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QAdministCode_AdministCodeId extends BeanPath<AdministCode.AdministCodeId> {

    private static final long serialVersionUID = 473054879L;

    public static final QAdministCode_AdministCodeId administCodeId = new QAdministCode_AdministCodeId("administCodeId");

    public final StringPath administZoneCode = createString("administZoneCode");

    public final StringPath administZoneSe = createString("administZoneSe");

    public QAdministCode_AdministCodeId(String variable) {
        super(AdministCode.AdministCodeId.class, forVariable(variable));
    }

    public QAdministCode_AdministCodeId(Path<? extends AdministCode.AdministCodeId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QAdministCode_AdministCodeId(PathMetadata metadata) {
        super(AdministCode.AdministCodeId.class, metadata);
    }

}

