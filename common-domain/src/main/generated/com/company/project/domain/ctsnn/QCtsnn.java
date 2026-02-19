package com.company.project.domain.ctsnn;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QCtsnn is a Querydsl query type for Ctsnn
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QCtsnn extends EntityPathBase<Ctsnn> {

    private static final long serialVersionUID = 204472351L;

    public static final QCtsnn ctsnn = new QCtsnn("ctsnn");

    public final com.company.project.domain.common.QBaseTimeEntity _super = new com.company.project.domain.common.QBaseTimeEntity(this);

    public final StringPath brth = createString("brth");

    public final StringPath confmAt = createString("confmAt");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath ctsnnCd = createString("ctsnnCd");

    public final StringPath ctsnnId = createString("ctsnnId");

    public final StringPath ctsnnNm = createString("ctsnnNm");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final StringPath infrmlSanctnId = createString("infrmlSanctnId");

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath occrrDe = createString("occrrDe");

    public final StringPath relate = createString("relate");

    public final StringPath remark = createString("remark");

    public final StringPath reqstDe = createString("reqstDe");

    public final StringPath returnResn = createString("returnResn");

    public final DateTimePath<java.time.LocalDateTime> sanctnDt = createDateTime("sanctnDt", java.time.LocalDateTime.class);

    public final StringPath sanctnerId = createString("sanctnerId");

    public final StringPath trgterNm = createString("trgterNm");

    public final StringPath usid = createString("usid");

    public QCtsnn(String variable) {
        super(Ctsnn.class, forVariable(variable));
    }

    public QCtsnn(Path<? extends Ctsnn> path) {
        super(path.getType(), path.getMetadata());
    }

    public QCtsnn(PathMetadata metadata) {
        super(Ctsnn.class, metadata);
    }

}

