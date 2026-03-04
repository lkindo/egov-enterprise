package com.company.project.domain.survey;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QQustnrRespondInfo is a Querydsl query type for QustnrRespondInfo
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QQustnrRespondInfo extends EntityPathBase<QustnrRespondInfo> {

    private static final long serialVersionUID = 49429917L;

    public static final QQustnrRespondInfo qustnrRespondInfo = new QQustnrRespondInfo("qustnrRespondInfo");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath etcAnswerCn = createString("etcAnswerCn");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath qestnrId = createString("qestnrId");

    public final StringPath qestnrQesitmId = createString("qestnrQesitmId");

    public final StringPath qestnrQesrspnsId = createString("qestnrQesrspnsId");

    public final StringPath qestnrTmplatId = createString("qestnrTmplatId");

    public final StringPath qustnrIemId = createString("qustnrIemId");

    public final StringPath respondAnswerCn = createString("respondAnswerCn");

    public final StringPath respondNm = createString("respondNm");

    public QQustnrRespondInfo(String variable) {
        super(QustnrRespondInfo.class, forVariable(variable));
    }

    public QQustnrRespondInfo(Path<? extends QustnrRespondInfo> path) {
        super(path.getType(), path.getMetadata());
    }

    public QQustnrRespondInfo(PathMetadata metadata) {
        super(QustnrRespondInfo.class, metadata);
    }

}