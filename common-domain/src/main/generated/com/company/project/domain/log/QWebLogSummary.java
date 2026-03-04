package com.company.project.domain.log;

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

    private static final long serialVersionUID = 2003435669L;

    public static final QWebLogSummary webLogSummary = new QWebLogSummary("webLogSummary");

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
