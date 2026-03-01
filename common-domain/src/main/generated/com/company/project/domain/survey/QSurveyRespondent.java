package com.company.project.domain.survey;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QSurveyRespondent is a Querydsl query type for SurveyRespondent
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QSurveyRespondent extends EntityPathBase<SurveyRespondent> {

    private static final long serialVersionUID = -1817649075L;

    public static final QSurveyRespondent surveyRespondent = new QSurveyRespondent("surveyRespondent");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath areaNo = createString("areaNo");

    public final StringPath brth = createString("brth");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath endTelno = createString("endTelno");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath middleTelno = createString("middleTelno");

    public final StringPath occpTyCode = createString("occpTyCode");

    public final StringPath qestnrId = createString("qestnrId");

    public final StringPath qestnrRespondId = createString("qestnrRespondId");

    public final StringPath qestnrTmplatId = createString("qestnrTmplatId");

    public final StringPath respondNm = createString("respondNm");

    public final StringPath sexdstnCode = createString("sexdstnCode");

    public QSurveyRespondent(String variable) {
        super(SurveyRespondent.class, forVariable(variable));
    }

    public QSurveyRespondent(Path<? extends SurveyRespondent> path) {
        super(path.getType(), path.getMetadata());
    }

    public QSurveyRespondent(PathMetadata metadata) {
        super(SurveyRespondent.class, metadata);
    }

}
