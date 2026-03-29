package com.company.project.foundation.domain.system;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QImgTempId is a Querydsl query type for ImgTempId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QImgTempId extends BeanPath<ImgTempId> {

    private static final long serialVersionUID = -1402935595L;

    public static final QImgTempId imgTempId = new QImgTempId("imgTempId");

    public final StringPath erncslSe = createString("erncslSe");

    public final StringPath orgCode = createString("orgCode");

    public QImgTempId(String variable) {
        super(ImgTempId.class, forVariable(variable));
    }

    public QImgTempId(Path<? extends ImgTempId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QImgTempId(PathMetadata metadata) {
        super(ImgTempId.class, metadata);
    }

}

