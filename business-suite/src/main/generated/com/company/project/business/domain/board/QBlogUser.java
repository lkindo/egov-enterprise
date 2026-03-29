package com.company.project.business.domain.board;

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

    private static final long serialVersionUID = 837353348L;

    public static final QBlogUser blogUser = new QBlogUser("blogUser");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final StringPath blogId = createString("blogId");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath emplyrId = createString("emplyrId");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

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

