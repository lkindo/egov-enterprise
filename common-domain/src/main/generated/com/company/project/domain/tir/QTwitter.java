package com.company.project.domain.tir;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QTwitter is a Querydsl query type for Twitter
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QTwitter extends EntityPathBase<Twitter> {

    private static final long serialVersionUID = 49257579L;

    public static final QTwitter twitter = new QTwitter("twitter");

    public final StringPath cnsmrKey = createString("cnsmrKey");

    public final StringPath cnsmrSecret = createString("cnsmrSecret");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegistPnttm = createDateTime("frstRegistPnttm", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> lastUpdtPnttm = createDateTime("lastUpdtPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath userId = createString("userId");

    public QTwitter(String variable) {
        super(Twitter.class, forVariable(variable));
    }

    public QTwitter(Path<? extends Twitter> path) {
        super(path.getType(), path.getMetadata());
    }

    public QTwitter(PathMetadata metadata) {
        super(Twitter.class, metadata);
    }

}
