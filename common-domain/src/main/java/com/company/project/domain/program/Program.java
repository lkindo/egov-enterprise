package com.company.project.domain.program;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "NPROGRMLIST")
public class Program {

    @Id
    @Column(name = "PROGRM_FILE_NM", length = 60)
    private String progrmFileNm;

    @Column(name = "PROGRM_STRE_PATH", length = 100)
    private String progrmStrePath;

    @Column(name = "PROGRM_KOREAN_NM", length = 60)
    private String progrmKoreanNm;

    @Column(name = "URL", length = 100)
    private String url;

    @Column(name = "PROGRM_DC", length = 200)
    private String progrmDc;

    @Builder
    public Program(String progrmFileNm, String progrmStrePath, String progrmKoreanNm, String url, String progrmDc) {
        this.progrmFileNm = progrmFileNm;
        this.progrmStrePath = progrmStrePath;
        this.progrmKoreanNm = progrmKoreanNm;
        this.url = url;
        this.progrmDc = progrmDc;
    }

    public void update(String progrmStrePath, String progrmKoreanNm, String url, String progrmDc) {
        this.progrmStrePath = progrmStrePath;
        this.progrmKoreanNm = progrmKoreanNm;
        this.url = url;
        this.progrmDc = progrmDc;
    }
}