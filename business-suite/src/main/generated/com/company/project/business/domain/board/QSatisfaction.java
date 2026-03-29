package com.company.project.business.domain.board;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QSatisfaction is a Querydsl query type for Satisfaction
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSatisfaction extends EntityPathBase<Satisfaction> {

    private static final long serialVersionUID = -1899508221L;

    public static final QSatisfaction satisfaction = new QSatisfaction("satisfaction");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final NumberPath<Long> articleId = createNumber("articleId", Long.class);

    public final StringPath boardId = createString("boardId");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final NumberPath<Long> id = createNumber("id", Long.class);

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath password = createString("password");

    public final NumberPath<Integer> satisfactionLevel = createNumber("satisfactionLevel", Integer.class);

    public final StringPath satisfactionOpinion = createString("satisfactionOpinion");

    public final StringPath useAt = createString("useAt");

    public final StringPath writerId = createString("writerId");

    public final StringPath writerNm = createString("writerNm");

    public QSatisfaction(String variable) {
        super(Satisfaction.class, forVariable(variable));
    }

    public QSatisfaction(Path<? extends Satisfaction> path) {
        super(path.getType(), path.getMetadata());
    }

    public QSatisfaction(PathMetadata metadata) {
        super(Satisfaction.class, metadata);
    }

}

