package com.company.project.domain.system;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QAnnualLeave is a Querydsl query type for AnnualLeave
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QAnnualLeave extends EntityPathBase<AnnualLeave> {

    private static final long serialVersionUID = -1181223888L;

    public static final QAnnualLeave annualLeave = new QAnnualLeave("annualLeave");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final NumberPath<Double> occrncYrycCo = createNumber("occrncYrycCo", Double.class);

    public final StringPath occrrncYear = createString("occrrncYear");

    public final NumberPath<Double> remndrYrycCo = createNumber("remndrYrycCo", Double.class);

    public final NumberPath<Double> useYrycCo = createNumber("useYrycCo", Double.class);

    public final StringPath usid = createString("usid");

    public QAnnualLeave(String variable) {
        super(AnnualLeave.class, forVariable(variable));
    }

    public QAnnualLeave(Path<? extends AnnualLeave> path) {
        super(path.getType(), path.getMetadata());
    }

    public QAnnualLeave(PathMetadata metadata) {
        super(AnnualLeave.class, metadata);
    }

}