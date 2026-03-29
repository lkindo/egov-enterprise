package com.company.project.business.domain.knowledge;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QKnowledge is a Querydsl query type for Knowledge
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QKnowledge extends EntityPathBase<Knowledge> {

    private static final long serialVersionUID = 6939007L;

    public static final QKnowledge knowledge = new QKnowledge("knowledge");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath colYmd = createString("colYmd");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath emplyrId = createString("emplyrId");

    public final StringPath knoCn = createString("knoCn");

    public final StringPath knoId = createString("knoId");

    public final StringPath knoNm = createString("knoNm");

    public final StringPath knoTypeCd = createString("knoTypeCd");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath orgnztId = createString("orgnztId");

    public final StringPath othbcAt = createString("othbcAt");

    public QKnowledge(String variable) {
        super(Knowledge.class, forVariable(variable));
    }

    public QKnowledge(Path<? extends Knowledge> path) {
        super(path.getType(), path.getMetadata());
    }

    public QKnowledge(PathMetadata metadata) {
        super(Knowledge.class, metadata);
    }

}

