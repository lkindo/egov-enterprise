package com.company.project.domain.code;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QInstitutionCodeRecptnLog_InstitutionCodeRecptnLogId is a Querydsl query type for InstitutionCodeRecptnLogId
 */
@Generated("com.querydsl.codegen.DefaultEmbeddableSerializer")
public class QInstitutionCodeRecptnLog_InstitutionCodeRecptnLogId extends BeanPath<InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId> {

    private static final long serialVersionUID = 1850560063L;

    public static final QInstitutionCodeRecptnLog_InstitutionCodeRecptnLogId institutionCodeRecptnLogId = new QInstitutionCodeRecptnLog_InstitutionCodeRecptnLogId("institutionCodeRecptnLogId");

    public final StringPath insttCode = createString("insttCode");

    public final StringPath occrrncDe = createString("occrrncDe");

    public final NumberPath<Long> opertSn = createNumber("opertSn", Long.class);

    public QInstitutionCodeRecptnLog_InstitutionCodeRecptnLogId(String variable) {
        super(InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId.class, forVariable(variable));
    }

    public QInstitutionCodeRecptnLog_InstitutionCodeRecptnLogId(Path<? extends InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId> path) {
        super(path.getType(), path.getMetadata());
    }

    public QInstitutionCodeRecptnLog_InstitutionCodeRecptnLogId(PathMetadata metadata) {
        super(InstitutionCodeRecptnLog.InstitutionCodeRecptnLogId.class, metadata);
    }

}
