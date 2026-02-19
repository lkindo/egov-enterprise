package com.company.project.domain.knowledge;

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

    private static final long serialVersionUID = 1664498775L;

    public static final QKnowledge knowledge = new QKnowledge("knowledge");

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath colYmd = createString("colYmd");

    public final StringPath emplyrId = createString("emplyrId");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath knoCn = createString("knoCn");

    public final StringPath knoId = createString("knoId");

    public final StringPath knoNm = createString("knoNm");

    public final StringPath knoTypeCd = createString("knoTypeCd");

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

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

