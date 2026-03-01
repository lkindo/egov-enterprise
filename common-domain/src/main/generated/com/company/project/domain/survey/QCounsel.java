package com.company.project.domain.survey;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QCounsel is a Querydsl query type for Counsel
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QCounsel extends EntityPathBase<Counsel> {

    private static final long serialVersionUID = 523250808L;

    public static final QCounsel counsel = new QCounsel("counsel");

    public final com.company.project.domain.common.QBaseTimeEntity _super = new com.company.project.domain.common.QBaseTimeEntity(this);

    public final StringPath counselContent = createString("counselContent");

    public final StringPath counselId = createString("counselId");

    public final StringPath counselSubject = createString("counselSubject");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath frstRegisterId = createString("frstRegisterId");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath managerContent = createString("managerContent");

    public final StringPath managerDate = createString("managerDate");

    public final StringPath openAt = createString("openAt");

    public final StringPath status = createString("status");

    public final StringPath writeDate = createString("writeDate");

    public final StringPath writerId = createString("writerId");

    public final StringPath writerNm = createString("writerNm");

    public QCounsel(String variable) {
        super(Counsel.class, forVariable(variable));
    }

    public QCounsel(Path<? extends Counsel> path) {
        super(path.getType(), path.getMetadata());
    }

    public QCounsel(PathMetadata metadata) {
        super(Counsel.class, metadata);
    }

}
