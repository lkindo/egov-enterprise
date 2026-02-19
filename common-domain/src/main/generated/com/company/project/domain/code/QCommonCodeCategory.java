package com.company.project.domain.code;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QCommonCodeCategory is a Querydsl query type for CommonCodeCategory
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QCommonCodeCategory extends EntityPathBase<CommonCodeCategory> {

    private static final long serialVersionUID = 1464639040L;

    public static final QCommonCodeCategory commonCodeCategory = new QCommonCodeCategory("commonCodeCategory");

    public final StringPath clCode = createString("clCode");

    public final StringPath clCodeDc = createString("clCodeDc");

    public final StringPath clCodeNm = createString("clCodeNm");

    public final DateTimePath<java.time.LocalDateTime> createdDate = createDateTime("createdDate", java.time.LocalDateTime.class);

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = createDateTime("lastModifiedDate", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final StringPath useAt = createString("useAt");

    public QCommonCodeCategory(String variable) {
        super(CommonCodeCategory.class, forVariable(variable));
    }

    public QCommonCodeCategory(Path<? extends CommonCodeCategory> path) {
        super(path.getType(), path.getMetadata());
    }

    public QCommonCodeCategory(PathMetadata metadata) {
        super(CommonCodeCategory.class, metadata);
    }

}

