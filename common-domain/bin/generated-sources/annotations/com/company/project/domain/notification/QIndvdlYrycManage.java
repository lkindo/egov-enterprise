package com.company.project.domain.notification;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QIndvdlYrycManage is a Querydsl query type for IndvdlYrycManage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QIndvdlYrycManage extends EntityPathBase<IndvdlYrycManage> {

    private static final long serialVersionUID = 131930291L;

    public static final QIndvdlYrycManage indvdlYrycManage = new QIndvdlYrycManage("indvdlYrycManage");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath occrrncYear = createString("occrrncYear");

    public final NumberPath<Double> remndrYrycCo = createNumber("remndrYrycCo", Double.class);

    public final StringPath userId = createString("userId");

    public final NumberPath<Double> useYrycCo = createNumber("useYrycCo", Double.class);

    public final NumberPath<Double> yrycOccrrncCo = createNumber("yrycOccrrncCo", Double.class);

    public QIndvdlYrycManage(String variable) {
        super(IndvdlYrycManage.class, forVariable(variable));
    }

    public QIndvdlYrycManage(Path<? extends IndvdlYrycManage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QIndvdlYrycManage(PathMetadata metadata) {
        super(IndvdlYrycManage.class, metadata);
    }

}

