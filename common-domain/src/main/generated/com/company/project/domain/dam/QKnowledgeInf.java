package com.company.project.domain.dam;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QKnowledgeInf is a Querydsl query type for KnowledgeInf
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QKnowledgeInf extends EntityPathBase<KnowledgeInf> {

    private static final long serialVersionUID = -1209768072L;

    public static final QKnowledgeInf knowledgeInf = new QKnowledgeInf("knowledgeInf");

    public final StringPath appYmd = createString("appYmd");

    public final StringPath atchFileId = createString("atchFileId");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath junkYmd = createString("junkYmd");

    public final StringPath knoAps = createString("knoAps");

    public final StringPath knoCn = createString("knoCn");

    public final StringPath knoId = createString("knoId");

    public final StringPath knoNm = createString("knoNm");

    public final StringPath knoTypeCd = createString("knoTypeCd");

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath orgnztId = createString("orgnztId");

    public final StringPath othbcAt = createString("othbcAt");

    public final StringPath speId = createString("speId");

    public QKnowledgeInf(String variable) {
        super(KnowledgeInf.class, forVariable(variable));
    }

    public QKnowledgeInf(Path<? extends KnowledgeInf> path) {
        super(path.getType(), path.getMetadata());
    }

    public QKnowledgeInf(PathMetadata metadata) {
        super(KnowledgeInf.class, metadata);
    }

}