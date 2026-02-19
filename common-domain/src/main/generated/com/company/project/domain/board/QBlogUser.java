package com.company.project.domain.board;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QBlogUser is a Querydsl query type for BlogUser
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QBlogUser extends EntityPathBase<BlogUser> {

    private static final long serialVersionUID = -480952916L;

    public static final QBlogUser blogUser = new QBlogUser("blogUser");

    public final StringPath blogId = createString("blogId");

    public final StringPath emplyrId = createString("emplyrId");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath mberSttus = createString("mberSttus");

    public final StringPath mngrAt = createString("mngrAt");

    public final DateTimePath<java.time.LocalDateTime> sbscrbDe = createDateTime("sbscrbDe", java.time.LocalDateTime.class);

    public final DateTimePath<java.time.LocalDateTime> secsnDe = createDateTime("secsnDe", java.time.LocalDateTime.class);

    public final StringPath useAt = createString("useAt");

    public QBlogUser(String variable) {
        super(BlogUser.class, forVariable(variable));
    }

    public QBlogUser(Path<? extends BlogUser> path) {
        super(path.getType(), path.getMetadata());
    }

    public QBlogUser(PathMetadata metadata) {
        super(BlogUser.class, metadata);
    }

}

