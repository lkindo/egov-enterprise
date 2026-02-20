package com.company.project.domain.image;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QMainImage is a Querydsl query type for MainImage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QMainImage extends EntityPathBase<MainImage> {

    private static final long serialVersionUID = 788389912L;

    public static final QMainImage mainImage = new QMainImage("mainImage");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath image = createString("image");

    public final StringPath imageDc = createString("imageDc");

    public final StringPath imageFile = createString("imageFile");

    public final StringPath imageId = createString("imageId");

    public final StringPath imageNm = createString("imageNm");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath reflctAt = createString("reflctAt");

    public QMainImage(String variable) {
        super(MainImage.class, forVariable(variable));
    }

    public QMainImage(Path<? extends MainImage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QMainImage(PathMetadata metadata) {
        super(MainImage.class, metadata);
    }

}

