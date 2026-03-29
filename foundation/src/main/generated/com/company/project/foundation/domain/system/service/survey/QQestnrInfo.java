package com.company.project.foundation.domain.system.service.survey;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QQestnrInfo is a Querydsl query type for QestnrInfo
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QQestnrInfo extends EntityPathBase<QestnrInfo> {

    private static final long serialVersionUID = -1217392699L;

    public static final QQestnrInfo qestnrInfo = new QQestnrInfo("qestnrInfo");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath qestnrBeginDe = createString("qestnrBeginDe");

    public final StringPath qestnrEndDe = createString("qestnrEndDe");

    public final StringPath qestnrId = createString("qestnrId");

    public final StringPath qestnrPurps = createString("qestnrPurps");

    public final StringPath qestnrSj = createString("qestnrSj");

    public final StringPath qestnrTmplatId = createString("qestnrTmplatId");

    public final StringPath qestnrTrget = createString("qestnrTrget");

    public final StringPath qestnrWritngGuidanceCn = createString("qestnrWritngGuidanceCn");

    public QQestnrInfo(String variable) {
        super(QestnrInfo.class, forVariable(variable));
    }

    public QQestnrInfo(Path<? extends QestnrInfo> path) {
        super(path.getType(), path.getMetadata());
    }

    public QQestnrInfo(PathMetadata metadata) {
        super(QestnrInfo.class, metadata);
    }

}

