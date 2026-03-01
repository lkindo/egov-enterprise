package com.company.project.domain.auth;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QAuthority is a Querydsl query type for Authority
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QAuthority extends EntityPathBase<Authority> {

    private static final long serialVersionUID = 553249620L;

    public static final QAuthority authority = new QAuthority("authority");

    public final StringPath authorCode = createString("authorCode");

    public final DateTimePath<java.time.LocalDateTime> authorCreatDe = createDateTime("authorCreatDe", java.time.LocalDateTime.class);

    public final StringPath authorDc = createString("authorDc");

    public final StringPath authorNm = createString("authorNm");

    public QAuthority(String variable) {
        super(Authority.class, forVariable(variable));
    }

    public QAuthority(Path<? extends Authority> path) {
        super(path.getType(), path.getMetadata());
    }

    public QAuthority(PathMetadata metadata) {
        super(Authority.class, metadata);
    }

}
