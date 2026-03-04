package com.company.project.domain.dam;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QKnowledgeRequest is a Querydsl query type for KnowledgeRequest
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QKnowledgeRequest extends EntityPathBase<KnowledgeRequest> {

    private static final long serialVersionUID = -1518199130L;

    public static final QKnowledgeRequest knowledgeRequest = new QKnowledgeRequest("knowledgeRequest");

    public final NumberPath<Integer> ansDepth = createNumber("ansDepth", Integer.class);

    public final NumberPath<Long> ansNumber = createNumber("ansNumber", Long.class);

    public final StringPath ansParents = createString("ansParents");

    public final NumberPath<Integer> ansSeq = createNumber("ansSeq", Integer.class);

    public final StringPath atchFileId = createString("atchFileId");

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

    public final StringPath speId = createString("speId");

    public QKnowledgeRequest(String variable) {
        super(KnowledgeRequest.class, forVariable(variable));
    }

    public QKnowledgeRequest(Path<? extends KnowledgeRequest> path) {
        super(path.getType(), path.getMetadata());
    }

    public QKnowledgeRequest(PathMetadata metadata) {
        super(KnowledgeRequest.class, metadata);
    }

}