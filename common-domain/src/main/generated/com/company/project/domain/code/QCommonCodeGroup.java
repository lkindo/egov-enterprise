package com.company.project.domain.code;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QCommonCodeGroup is a Querydsl query type for CommonCodeGroup
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QCommonCodeGroup extends EntityPathBase<CommonCodeGroup> {

    private static final long serialVersionUID = -1063621507L;

    public static final QCommonCodeGroup commonCodeGroup = new QCommonCodeGroup("commonCodeGroup");

    public final StringPath clCode = createString("clCode");

    public final StringPath codeId = createString("codeId");

    public final StringPath codeIdDc = createString("codeIdDc");

    public final StringPath codeIdNm = createString("codeIdNm");

    public final DateTimePath<java.time.LocalDateTime> createdDate = createDateTime("createdDate", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = createDateTime("lastModifiedDate", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath useAt = createString("useAt");

    public QCommonCodeGroup(String variable) {
        super(CommonCodeGroup.class, forVariable(variable));
    }

    public QCommonCodeGroup(Path<? extends CommonCodeGroup> path) {
        super(path.getType(), path.getMetadata());
    }

    public QCommonCodeGroup(PathMetadata metadata) {
        super(CommonCodeGroup.class, metadata);
    }

}
