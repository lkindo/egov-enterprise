package com.company.project.domain.image;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QLoginImage is a Querydsl query type for LoginImage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QLoginImage extends EntityPathBase<LoginImage> {

    private static final long serialVersionUID = 1025417532L;

    public static final QLoginImage loginImage = new QLoginImage("loginImage");

    public final com.company.project.domain.common.QBaseTimeEntity _super = new com.company.project.domain.common.QBaseTimeEntity(this);

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final StringPath image = createString("image");

    public final StringPath imageDc = createString("imageDc");

    public final StringPath imageFile = createString("imageFile");

    public final StringPath imageId = createString("imageId");

    public final StringPath imageNm = createString("imageNm");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath reflctAt = createString("reflctAt");

    public QLoginImage(String variable) {
        super(LoginImage.class, forVariable(variable));
    }

    public QLoginImage(Path<? extends LoginImage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QLoginImage(PathMetadata metadata) {
        super(LoginImage.class, metadata);
    }

}