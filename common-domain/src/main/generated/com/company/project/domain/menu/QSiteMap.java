package com.company.project.domain.menu;

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

    private static final long serialVersionUID = 1133935005L;

    public static final QSiteMap siteMap = new QSiteMap("siteMap");

    public final StringPath bndeFileNm = createString("bndeFileNm");

    public final StringPath bndeFilePath = createString("bndeFilePath");

    public final StringPath creatPersonId = createString("creatPersonId");

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
