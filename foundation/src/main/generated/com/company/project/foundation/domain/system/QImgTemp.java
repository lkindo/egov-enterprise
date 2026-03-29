package com.company.project.foundation.domain.system;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;
import com.querydsl.core.types.dsl.PathInits;


/**
 * QImgTemp is a Querydsl query type for ImgTemp
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QImgTemp extends EntityPathBase<ImgTemp> {

    private static final long serialVersionUID = 38763546L;

    private static final PathInits INITS = PathInits.DIRECT2;

    public static final QImgTemp imgTemp = new QImgTemp("imgTemp");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final QImgTempId id;

    public final ArrayPath<byte[], Byte> imageInfo = createArray("imageInfo", byte[].class);

    public final StringPath imageType = createString("imageType");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public QImgTemp(String variable) {
        this(ImgTemp.class, forVariable(variable), INITS);
    }

    public QImgTemp(Path<? extends ImgTemp> path) {
        this(path.getType(), path.getMetadata(), PathInits.getFor(path.getMetadata(), INITS));
    }

    public QImgTemp(PathMetadata metadata) {
        this(metadata, PathInits.getFor(metadata, INITS));
    }

    public QImgTemp(PathMetadata metadata, PathInits inits) {
        this(ImgTemp.class, metadata, inits);
    }

    public QImgTemp(Class<? extends ImgTemp> type, PathMetadata metadata, PathInits inits) {
        super(type, metadata, inits);
        this.id = inits.isInitialized("id") ? new QImgTempId(forProperty("id")) : null;
    }

}

