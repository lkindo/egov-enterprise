package com.company.project.domain.notification;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QRssTag is a Querydsl query type for RssTag
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QRssTag extends EntityPathBase<RssTag> {

    private static final long serialVersionUID = 1351076820L;

    public static final QRssTag rssTag = new QRssTag("rssTag");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath descriptionTag = createString("descriptionTag");

    public final StringPath hderTag = createString("hderTag");

    public final StringPath itemTag = createString("itemTag");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath linkTag = createString("linkTag");

    public final StringPath rssId = createString("rssId");

    public final StringPath titleTag = createString("titleTag");

    public final NumberPath<Integer> trgetSvcListCo = createNumber("trgetSvcListCo", Integer.class);

    public final StringPath trgetSvcNm = createString("trgetSvcNm");

    public final StringPath trgetSvcTable = createString("trgetSvcTable");

    public QRssTag(String variable) {
        super(RssTag.class, forVariable(variable));
    }

    public QRssTag(Path<? extends RssTag> path) {
        super(path.getType(), path.getMetadata());
    }

    public QRssTag(PathMetadata metadata) {
        super(RssTag.class, metadata);
    }

}
