package com.company.project.domain.wiki;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QWikiBookmark is a Querydsl query type for WikiBookmark
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QWikiBookmark extends EntityPathBase<WikiBookmark> {

    private static final long serialVersionUID = 1693981261L;

    public static final QWikiBookmark wikiBookmark = new QWikiBookmark("wikiBookmark");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath userId = createString("userId");

    public final StringPath wikiBkmkId = createString("wikiBkmkId");

    public final StringPath wikiBkmkNm = createString("wikiBkmkNm");

    public QWikiBookmark(String variable) {
        super(WikiBookmark.class, forVariable(variable));
    }

    public QWikiBookmark(Path<? extends WikiBookmark> path) {
        super(path.getType(), path.getMetadata());
    }

    public QWikiBookmark(PathMetadata metadata) {
        super(WikiBookmark.class, metadata);
    }

}
