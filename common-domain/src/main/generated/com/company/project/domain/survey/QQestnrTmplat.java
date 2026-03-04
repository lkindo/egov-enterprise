package com.company.project.domain.survey;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QQestnrTmplat is a Querydsl query type for QestnrTmplat
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QQestnrTmplat extends EntityPathBase<QestnrTmplat> {

    private static final long serialVersionUID = 1915487774L;

    public static final QQestnrTmplat qestnrTmplat = new QQestnrTmplat("qestnrTmplat");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath qestnrTmplatCn = createString("qestnrTmplatCn");

    public final StringPath qestnrTmplatId = createString("qestnrTmplatId");

    public final StringPath qestnrTmplatImagepathnm = createString("qestnrTmplatImagepathnm");

    public final StringPath qestnrTmplatTy = createString("qestnrTmplatTy");

    public QQestnrTmplat(String variable) {
        super(QestnrTmplat.class, forVariable(variable));
    }

    public QQestnrTmplat(Path<? extends QestnrTmplat> path) {
        super(path.getType(), path.getMetadata());
    }

    public QQestnrTmplat(PathMetadata metadata) {
        super(QestnrTmplat.class, metadata);
    }

}
