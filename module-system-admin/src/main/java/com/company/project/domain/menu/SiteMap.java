package com.company.project.domain.menu;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "NSITEMAP")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SiteMap {

    @Id
    @Column(name = "MAPNG_CREAT_ID", length = 30)
    private String mapCreatId;

    @Column(name = "CREAT_PERSON_ID", length = 30)
    private String creatPersonId;

    @Column(name = "MAPNG_FILE_NM", length = 60)
    private String bndeFileNm;

    @Column(name = "MAPNG_FILE_PATH", length = 100)
    private String bndeFilePath;

    @Builder
    public SiteMap(String mapCreatId, String creatPersonId, String bndeFileNm, String bndeFilePath) {
        this.mapCreatId = mapCreatId;
        this.creatPersonId = creatPersonId;
        this.bndeFileNm = bndeFileNm;
        this.bndeFilePath = bndeFilePath;
    }
}
