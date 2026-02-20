package com.company.project.domain.sanctn;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QInformalSanctn is a Querydsl query type for InformalSanctn
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QInformalSanctn extends EntityPathBase<InformalSanctn> {

    private static final long serialVersionUID = -1941488693L;

    public static final QInformalSanctn informalSanctn = new QInformalSanctn("informalSanctn");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath applcntId = createString("applcntId");

    public final StringPath confmAt = createString("confmAt");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath infrmlSanctnId = createString("infrmlSanctnId");

    public final StringPath jobSeCode = createString("jobSeCode");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath reqstDe = createString("reqstDe");

    public final StringPath returnResn = createString("returnResn");

    public final DateTimePath<java.time.LocalDateTime> sanctnDt = createDateTime("sanctnDt", java.time.LocalDateTime.class);

    public final StringPath sanctnerId = createString("sanctnerId");

    public QInformalSanctn(String variable) {
        super(InformalSanctn.class, forVariable(variable));
    }

    public QInformalSanctn(Path<? extends InformalSanctn> path) {
        super(path.getType(), path.getMetadata());
    }

    public QInformalSanctn(PathMetadata metadata) {
        super(InformalSanctn.class, metadata);
    }

}

