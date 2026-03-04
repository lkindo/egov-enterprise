package com.company.project.domain.calendar;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QRestde is a Querydsl query type for Restde
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QRestde extends EntityPathBase<Restde> {

    private static final long serialVersionUID = -1925385714L;

    public static final QRestde restde = new QRestde("restde");

    public final com.company.project.domain.common.QBaseTimeEntity _super = new com.company.project.domain.common.QBaseTimeEntity(this);

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath frstRegisterId = createString("frstRegisterId");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath restdeDc = createString("restdeDc");

    public final StringPath restdeDe = createString("restdeDe");

    public final StringPath restdeNm = createString("restdeNm");

    public final NumberPath<Integer> restdeNo = createNumber("restdeNo", Integer.class);

    public final StringPath restdeSeCode = createString("restdeSeCode");

    public QRestde(String variable) {
        super(Restde.class, forVariable(variable));
    }

    public QRestde(Path<? extends Restde> path) {
        super(path.getType(), path.getMetadata());
    }

    public QRestde(PathMetadata metadata) {
        super(Restde.class, metadata);
    }

}
