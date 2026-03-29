package com.company.project.foundation.domain.menu;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QSiteMap is a Querydsl query type for SiteMap
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSiteMap extends EntityPathBase<SiteMap> {

    private static final long serialVersionUID = 982070824L;

    public static final QSiteMap siteMap = new QSiteMap("siteMap");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    public final StringPath bndeFileNm = createString("bndeFileNm");

    public final StringPath bndeFilePath = createString("bndeFilePath");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath creatPersonId = createString("creatPersonId");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath mapCreatId = createString("mapCreatId");

    public QSiteMap(String variable) {
        super(SiteMap.class, forVariable(variable));
    }

    public QSiteMap(Path<? extends SiteMap> path) {
        super(path.getType(), path.getMetadata());
    }

    public QSiteMap(PathMetadata metadata) {
        super(SiteMap.class, metadata);
    }

}

