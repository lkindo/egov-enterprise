package com.company.project.domain.notification;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QLoginScrinImage is a Querydsl query type for LoginScrinImage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QLoginScrinImage extends EntityPathBase<LoginScrinImage> {

    private static final long serialVersionUID = 917054129L;

    public static final QLoginScrinImage loginScrinImage = new QLoginScrinImage("loginScrinImage");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath image = createString("image");

    public final StringPath imageDc = createString("imageDc");

    public final StringPath imageFile = createString("imageFile");

    public final StringPath imageId = createString("imageId");

    public final StringPath imageNm = createString("imageNm");

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath reflctAt = createString("reflctAt");

    public QLoginScrinImage(String variable) {
        super(LoginScrinImage.class, forVariable(variable));
    }

    public QLoginScrinImage(Path<? extends LoginScrinImage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QLoginScrinImage(PathMetadata metadata) {
        super(LoginScrinImage.class, metadata);
    }

}

