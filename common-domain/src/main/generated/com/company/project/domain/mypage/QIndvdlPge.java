package com.company.project.domain.mypage;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QIndvdlPge is a Querydsl query type for IndvdlPge
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QIndvdlPge extends EntityPathBase<IndvdlPge> {

    private static final long serialVersionUID = -433499981L;

    public static final QIndvdlPge indvdlPge = new QIndvdlPge("indvdlPge");

    public final StringPath cntcUrl = createString("cntcUrl");

    public final StringPath cntntsDc = createString("cntntsDc");

    public final StringPath cntntsId = createString("cntntsId");

    public final StringPath cntntsLinkUrl = createString("cntntsLinkUrl");

    public final StringPath cntntsNm = createString("cntntsNm");

    public final StringPath cntntsUseAt = createString("cntntsUseAt");

    public QIndvdlPge(String variable) {
        super(IndvdlPge.class, forVariable(variable));
    }

    public QIndvdlPge(Path<? extends IndvdlPge> path) {
        super(path.getType(), path.getMetadata());
    }

    public QIndvdlPge(PathMetadata metadata) {
        super(IndvdlPge.class, metadata);
    }

}