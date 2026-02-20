package com.company.project.domain.scrap;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QScrap is a Querydsl query type for Scrap
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QScrap extends EntityPathBase<Scrap> {

    private static final long serialVersionUID = -1316150851L;

    public static final QScrap scrap = new QScrap("scrap");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath bbsId = createString("bbsId");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final NumberPath<Long> nttId = createNumber("nttId", Long.class);

    public final StringPath scrapId = createString("scrapId");

    public final StringPath scrapNm = createString("scrapNm");

    public final StringPath useAt = createString("useAt");

    public QScrap(String variable) {
        super(Scrap.class, forVariable(variable));
    }

    public QScrap(Path<? extends Scrap> path) {
        super(path.getType(), path.getMetadata());
    }

    public QScrap(PathMetadata metadata) {
        super(Scrap.class, metadata);
    }

}

