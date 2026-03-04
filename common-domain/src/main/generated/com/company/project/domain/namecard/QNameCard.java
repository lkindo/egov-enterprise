package com.company.project.domain.namecard;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QNameCard is a Querydsl query type for NameCard
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QNameCard extends EntityPathBase<NameCard> {

    private static final long serialVersionUID = -1255605129L;

    public static final QNameCard nameCard = new QNameCard("nameCard");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath adres = createString("adres");

    public final StringPath clsfNm = createString("clsfNm");

    public final StringPath cmpnyNm = createString("cmpnyNm");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath deptNm = createString("deptNm");

    public final StringPath detailAdres = createString("detailAdres");

    public final StringPath emailAdres = createString("emailAdres");

    public final StringPath extrlUserAt = createString("extrlUserAt");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath mbtlNum = createString("mbtlNum");

    public final StringPath ncrdId = createString("ncrdId");

    public final StringPath ncrdNm = createString("ncrdNm");

    public final StringPath ncrdTrgterId = createString("ncrdTrgterId");

    public final StringPath ofcpsNm = createString("ofcpsNm");

    public final StringPath othbcAt = createString("othbcAt");

    public final StringPath remark = createString("remark");

    public final StringPath telNo = createString("telNo");

    public QNameCard(String variable) {
        super(NameCard.class, forVariable(variable));
    }

    public QNameCard(Path<? extends NameCard> path) {
        super(path.getType(), path.getMetadata());
    }

    public QNameCard(PathMetadata metadata) {
        super(NameCard.class, metadata);
    }

}
