package com.company.project.domain.recomendsite;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QRecomendSite is a Querydsl query type for RecomendSite
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QRecomendSite extends EntityPathBase<RecomendSite> {

    private static final long serialVersionUID = 792058519L;

    public static final QRecomendSite recomendSite = new QRecomendSite("recomendSite");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath confmDe = createString("confmDe");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath recomendConfmAt = createString("recomendConfmAt");

    public final StringPath recomendResnCn = createString("recomendResnCn");

    public final StringPath recomendSiteDc = createString("recomendSiteDc");

    public final StringPath recomendSiteId = createString("recomendSiteId");

    public final StringPath recomendSiteNm = createString("recomendSiteNm");

    public final StringPath recomendSiteUrl = createString("recomendSiteUrl");

    public QRecomendSite(String variable) {
        super(RecomendSite.class, forVariable(variable));
    }

    public QRecomendSite(Path<? extends RecomendSite> path) {
        super(path.getType(), path.getMetadata());
    }

    public QRecomendSite(PathMetadata metadata) {
        super(RecomendSite.class, metadata);
    }

}

