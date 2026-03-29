package com.company.project.foundation.domain.log;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QWebLogSummary is a Querydsl query type for WebLogSummary
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QWebLogSummary extends EntityPathBase<WebLogSummary> {

    private static final long serialVersionUID = -1006738710L;

    public static final QWebLogSummary webLogSummary = new QWebLogSummary("webLogSummary");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath occrrncDe = createString("occrrncDe");

    public final NumberPath<Long> rdcnt = createNumber("rdcnt", Long.class);

    public final StringPath url = createString("url");

    public QWebLogSummary(String variable) {
        super(WebLogSummary.class, forVariable(variable));
    }

    public QWebLogSummary(Path<? extends WebLogSummary> path) {
        super(path.getType(), path.getMetadata());
    }

    public QWebLogSummary(PathMetadata metadata) {
        super(WebLogSummary.class, metadata);
    }

}

