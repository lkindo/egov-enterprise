package com.company.project.domain.ctsnn;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QCtsnnManage is a Querydsl query type for CtsnnManage
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QCtsnnManage extends EntityPathBase<CtsnnManage> {

    private static final long serialVersionUID = 419477092L;

    public static final QCtsnnManage ctsnnManage = new QCtsnnManage("ctsnnManage");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath brth = createString("brth");

    public final StringPath confmAt = createString("confmAt");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath ctsnnCd = createString("ctsnnCd");

    public final StringPath ctsnnId = createString("ctsnnId");

    public final StringPath ctsnnNm = createString("ctsnnNm");

    public final StringPath infrmlSanctnId = createString("infrmlSanctnId");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath occrrDe = createString("occrrDe");

    public final StringPath relate = createString("relate");

    public final StringPath remark = createString("remark");

    public final StringPath reqstDe = createString("reqstDe");

    public final StringPath returnResn = createString("returnResn");

    public final DateTimePath<java.time.LocalDateTime> sanctnDt = createDateTime("sanctnDt", java.time.LocalDateTime.class);

    public final StringPath sanctnerId = createString("sanctnerId");

    public final StringPath trgterNm = createString("trgterNm");

    public final StringPath usid = createString("usid");

    public QCtsnnManage(String variable) {
        super(CtsnnManage.class, forVariable(variable));
    }

    public QCtsnnManage(Path<? extends CtsnnManage> path) {
        super(path.getType(), path.getMetadata());
    }

    public QCtsnnManage(PathMetadata metadata) {
        super(CtsnnManage.class, metadata);
    }

}
