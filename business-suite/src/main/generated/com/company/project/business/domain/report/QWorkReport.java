package com.company.project.business.domain.report;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QWorkReport is a Querydsl query type for WorkReport
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QWorkReport extends EntityPathBase<WorkReport> {

    private static final long serialVersionUID = 913041296L;

    public static final QWorkReport workReport = new QWorkReport("workReport");

    public final com.company.project.foundation.domain.common.QBaseEntity _super = new com.company.project.foundation.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath reportContent = createString("reportContent");

    public final StringPath reportDate = createString("reportDate");

    public final StringPath reportId = createString("reportId");

    public final StringPath reportStatus = createString("reportStatus");

    public final StringPath reportSubject = createString("reportSubject");

    public final StringPath reportType = createString("reportType");

    public final StringPath writerId = createString("writerId");

    public QWorkReport(String variable) {
        super(WorkReport.class, forVariable(variable));
    }

    public QWorkReport(Path<? extends WorkReport> path) {
        super(path.getType(), path.getMetadata());
    }

    public QWorkReport(PathMetadata metadata) {
        super(WorkReport.class, metadata);
    }

}

