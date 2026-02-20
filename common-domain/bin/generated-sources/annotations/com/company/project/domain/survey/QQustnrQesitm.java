package com.company.project.domain.survey;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QQustnrQesitm is a Querydsl query type for QustnrQesitm
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QQustnrQesitm extends EntityPathBase<QustnrQesitm> {

    private static final long serialVersionUID = -1159118743L;

    public static final QQustnrQesitm qustnrQesitm = new QQustnrQesitm("qustnrQesitm");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final NumberPath<Integer> mxmmChoiseCo = createNumber("mxmmChoiseCo", Integer.class);

    public final StringPath qestnCn = createString("qestnCn");

    public final StringPath qestnrId = createString("qestnrId");

    public final StringPath qestnrQesitmId = createString("qestnrQesitmId");

    public final StringPath qestnrTmplatId = createString("qestnrTmplatId");

    public final NumberPath<Long> qestnSn = createNumber("qestnSn", Long.class);

    public final StringPath qestnTyCode = createString("qestnTyCode");

    public QQustnrQesitm(String variable) {
        super(QustnrQesitm.class, forVariable(variable));
    }

    public QQustnrQesitm(Path<? extends QustnrQesitm> path) {
        super(path.getType(), path.getMetadata());
    }

    public QQustnrQesitm(PathMetadata metadata) {
        super(QustnrQesitm.class, metadata);
    }

}

