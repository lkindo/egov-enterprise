package com.company.project.domain.help;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QWordDicary is a Querydsl query type for WordDicary
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QWordDicary extends EntityPathBase<WordDicary> {

    private static final long serialVersionUID = -1236048982L;

    public static final QWordDicary wordDicary = new QWordDicary("wordDicary");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath engNm = createString("engNm");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath synonm = createString("synonm");

    public final StringPath wordDc = createString("wordDc");

    public final StringPath wordId = createString("wordId");

    public final StringPath wordNm = createString("wordNm");

    public QWordDicary(String variable) {
        super(WordDicary.class, forVariable(variable));
    }

    public QWordDicary(Path<? extends WordDicary> path) {
        super(path.getType(), path.getMetadata());
    }

    public QWordDicary(PathMetadata metadata) {
        super(WordDicary.class, metadata);
    }

}