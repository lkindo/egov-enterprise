package com.company.project.domain.site;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QSite is a Querydsl query type for Site
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSite extends EntityPathBase<Site> {

    private static final long serialVersionUID = -1649992105L;

    public static final QSite site = new QSite("site");

    public final StringPath actvtyAt = createString("actvtyAt");

    public final StringPath frstRegisterId = createString("frstRegisterId");

    public final DateTimePath<java.time.LocalDateTime> frstRegisterPnttm = createDateTime("frstRegisterPnttm", java.time.LocalDateTime.class);

    public final StringPath lastUpdusrId = createString("lastUpdusrId");

    public final DateTimePath<java.time.LocalDateTime> lastUpdusrPnttm = createDateTime("lastUpdusrPnttm", java.time.LocalDateTime.class);

    public final StringPath siteDc = createString("siteDc");

    public final StringPath siteId = createString("siteId");

    public final StringPath siteNm = createString("siteNm");

    public final StringPath siteThemaClCode = createString("siteThemaClCode");

    public final StringPath siteUrl = createString("siteUrl");

    public final StringPath useAt = createString("useAt");

    public QSite(String variable) {
        super(Site.class, forVariable(variable));
    }

    public QSite(Path<? extends Site> path) {
        super(path.getType(), path.getMetadata());
    }

    public QSite(PathMetadata metadata) {
        super(Site.class, metadata);
    }

}
