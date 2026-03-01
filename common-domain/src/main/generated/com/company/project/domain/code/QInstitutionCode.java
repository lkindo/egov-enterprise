package com.company.project.domain.code;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;


/**
 * QInstitutionCode is a Querydsl query type for InstitutionCode
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QInstitutionCode extends EntityPathBase<InstitutionCode> {

    private static final long serialVersionUID = 462333275L;

    public static final QInstitutionCode institutionCode = new QInstitutionCode("institutionCode");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath ablDe = createString("ablDe");

    public final StringPath ablEnnc = createString("ablEnnc");

    public final StringPath allInsttNm = createString("allInsttNm");

    public final StringPath bestInsttCode = createString("bestInsttCode");

    public final StringPath bsisDe = createString("bsisDe");

    public final StringPath changede = createString("changede");

    public final StringPath changeTime = createString("changeTime");

    public final StringPath creatDe = createString("creatDe");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    public final StringPath fxnum = createString("fxnum");

    public final StringPath insttAbrvNm = createString("insttAbrvNm");

    public final StringPath insttCode = createString("insttCode");

    public final StringPath insttOdr = createString("insttOdr");

    public final StringPath insttTyLclas = createString("insttTyLclas");

    public final StringPath insttTyMclas = createString("insttTyMclas");

    public final StringPath insttTySclas = createString("insttTySclas");

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath lowestInsttNm = createString("lowestInsttNm");

    public final StringPath odr = createString("odr");

    public final StringPath ord = createString("ord");

    public final StringPath reprsntInsttCode = createString("reprsntInsttCode");

    public final NumberPath<Integer> sortOrdr = createNumber("sortOrdr", Integer.class);

    public final StringPath telno = createString("telno");

    public final StringPath upperInsttCode = createString("upperInsttCode");

    public QInstitutionCode(String variable) {
        super(InstitutionCode.class, forVariable(variable));
    }

    public QInstitutionCode(Path<? extends InstitutionCode> path) {
        super(path.getType(), path.getMetadata());
    }

    public QInstitutionCode(PathMetadata metadata) {
        super(InstitutionCode.class, metadata);
    }

}
