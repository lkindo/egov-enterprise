package com.company.project.domain.rss;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QRss is a Querydsl query type for Rss
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QRss extends EntityPathBase<Rss> {

    private static final long serialVersionUID = 400129919L;

    public static final QRss rss = new QRss("rss");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath bdtDc = createString("bdtDc");

    public final StringPath bdtEtcTag = createString("bdtEtcTag");

    public final StringPath bdtLink = createString("bdtLink");

    public final StringPath bdtTag = createString("bdtTag");

    public final StringPath bdtTitle = createString("bdtTitle");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath hderDc = createString("hderDc");

    public final StringPath hderEtc = createString("hderEtc");

    public final StringPath hderLink = createString("hderLink");

    public final StringPath hderTag = createString("hderTag");

    public final StringPath hderTitle = createString("hderTitle");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath rssId = createString("rssId");

    public final NumberPath<Integer> trgetSvcListCo = createNumber("trgetSvcListCo", Integer.class);

    public final StringPath trgetSvcNm = createString("trgetSvcNm");

    public final StringPath trgetSvcTable = createString("trgetSvcTable");

    public QRss(String variable) {
        super(Rss.class, forVariable(variable));
    }

    public QRss(Path<? extends Rss> path) {
        super(path.getType(), path.getMetadata());
    }

    public QRss(PathMetadata metadata) {
        super(Rss.class, metadata);
    }

}
