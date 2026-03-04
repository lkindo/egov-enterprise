package com.company.project.domain.help;

import static com.querydsl.core.types.PathMetadataFactory.*;

import com.querydsl.core.types.dsl.*;

import com.querydsl.core.types.PathMetadata;
import javax.annotation.processing.Generated;
import com.querydsl.core.types.Path;

/**
 * QAdministrationWord is a Querydsl query type for AdministrationWord
 */
@Generated("com.querydsl.codegen.DefaultEntitySerializer")
public class QAdministrationWord extends EntityPathBase<AdministrationWord> {

    private static final long serialVersionUID = -714077858L;

    public static final QAdministrationWord administrationWord = new QAdministrationWord("administrationWord");

    public final com.company.project.domain.common.QBaseEntity _super = new com.company.project.domain.common.QBaseEntity(this);

    public final StringPath administWordAbrv = createString("administWordAbrv");

    public final StringPath administWordDc = createString("administWordDc");

    public final StringPath administWordDf = createString("administWordDf");

    public final StringPath administWordEngNm = createString("administWordEngNm");

    public final StringPath administWordId = createString("administWordId");

    public final StringPath administWordNm = createString("administWordNm");

    //inherited
    public final StringPath createdBy = _super.createdBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> createdDate = _super.createdDate;

    //inherited
    public final StringPath lastModifiedBy = _super.lastModifiedBy;

    //inherited
    public final DateTimePath<java.time.LocalDateTime> lastModifiedDate = _super.lastModifiedDate;

    public final StringPath stdWord = createString("stdWord");

    public final StringPath themaRelm = createString("themaRelm");

    public final StringPath wordDomn = createString("wordDomn");

    public QAdministrationWord(String variable) {
        super(AdministrationWord.class, forVariable(variable));
    }

    public QAdministrationWord(Path<? extends AdministrationWord> path) {
        super(path.getType(), path.getMetadata());
    }

    public QAdministrationWord(PathMetadata metadata) {
        super(AdministrationWord.class, metadata);
    }

}
