package com.company.project.domain.board;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QBlog is a Querydsl query type for Blog
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBlog extends EntityPathBase<Blog> {

    private static final long serialVersionUID = -1409554879L;

    public static final QBlog blog = new QBlog("blog");

    public final StringPath bbsId = createString("bbsId");

    public final StringPath blogAt = createString("blogAt");

    public final StringPath blogId = createString("blogId");

    public final StringPath blogIntrcn = createString("blogIntrcn");

    public final StringPath blogNm = createString("blogNm");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath registSeCode = createString("registSeCode");

    public final StringPath tmplatId = createString("tmplatId");

    public final StringPath useAt = createString("useAt");

    public QBlog(String variable) {
        super(Blog.class, forVariable(variable));
    }

    public QBlog(Path<? extends Blog> path) {
        super(path.getType(), path.getMetadata());
    }

    public QBlog(PathMetadata metadata) {
        super(Blog.class, metadata);
    }

}
