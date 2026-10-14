package nuri.migration.appscan;

import nuri.migration.appscan.AppUsageReport.ColumnUsage;
import nuri.migration.appscan.AppUsageReport.PartialFile;
import nuri.migration.appscan.AppUsageReport.UsageEvidence;
import nuri.migration.artifact.CollectionArtifactCodec;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

class AppSourceScannerTest {

    @TempDir
    Path root;

    private final AppSourceScanner scanner = new AppSourceScanner();

    @Test
    void mapperSqlYieldsAliasesJoinsLiteralsCaseLabelsBindingsAndCurrentTimeColumns() throws Exception {
        write("src/main/resources/sqlmap/UserMapper.xml", """
                <?xml version="1.0" encoding="UTF-8"?>
                <!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN" "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
                <mapper namespace="egov.user.UserMapper">
                  <resultMap id="userMap" type="egov.user.UserVO">
                    <result column="REG_DT" property="regDt"/>
                  </resultMap>
                  <select id="selectUser" resultMap="userMap">
                    SELECT U.USER_ID, U.USER_NM AS userNm,
                           CASE U.STAT_CD WHEN 'A' THEN '승인' WHEN 'R' THEN '반려' END AS statNm
                      FROM TB_USER U
                      JOIN TB_DEPT D ON U.DEPT_CD = D.DEPT_CD
                     WHERE U.USE_YN = 'Y'
                       AND U.USER_ID = #{userId}
                     <if test="statCd != null"> AND U.STAT_CD IN ('A', 'R') </if>
                  </select>
                  <insert id="insertUser">
                    INSERT INTO TB_USER (USER_ID, REG_DT, USE_YN) VALUES (#{userId}, SYSDATE, 'Y')
                  </insert>
                  <update id="updateUser">
                    UPDATE TB_USER SET MOD_DT = NOW(), USER_NM = #{userNm} WHERE USER_ID = #{userId}
                  </update>
                </mapper>
                """);

        AppUsageReport report = scanner.scan(root);

        assertThat(report.files().sqlMappers()).isEqualTo(1);
        assertThat(report.partialFiles()).containsExactly(
                new PartialFile("src/main/resources/sqlmap/UserMapper.xml", "DYNAMIC_SQL"));
        assertThat(report.status()).isEqualTo("PARTIAL");
        assertThat(usages(report, "USER_NM")).extracting(UsageEvidence::kind, UsageEvidence::table,
                        UsageEvidence::detail)
                .contains(tuple("SQL_SELECT_ALIAS", "TB_USER", "userNm"), tuple("SQL_BINDING", "TB_USER", "userNm"));
        assertThat(usages(report, "STAT_CD")).extracting(UsageEvidence::kind, UsageEvidence::value,
                        UsageEvidence::label)
                .contains(tuple("SQL_CASE", "A", "승인"), tuple("SQL_CASE", "R", "반려"),
                        tuple("SQL_LITERAL", "A", null), tuple("SQL_LITERAL", "R", null));
        assertThat(usages(report, "DEPT_CD")).extracting(UsageEvidence::kind, UsageEvidence::detail)
                .contains(tuple("SQL_JOIN", "TB_DEPT.DEPT_CD"), tuple("SQL_JOIN", "TB_USER.DEPT_CD"));
        assertThat(usages(report, "USE_YN")).extracting(UsageEvidence::kind, UsageEvidence::value)
                .contains(tuple("SQL_LITERAL", "Y"));
        assertThat(usages(report, "REG_DT")).extracting(UsageEvidence::kind, UsageEvidence::detail)
                .contains(tuple("SQL_CURRENT_TIME", "SYSDATE"), tuple("RESULT_MAP", "regDt"));
        assertThat(usages(report, "MOD_DT")).extracting(UsageEvidence::kind, UsageEvidence::detail)
                .contains(tuple("SQL_CURRENT_TIME", "NOW"));
        assertThat(usages(report, "USER_ID")).extracting(UsageEvidence::kind, UsageEvidence::detail)
                .contains(tuple("SQL_BINDING", "userId"));
        assertThat(report.tables()).extracting(AppUsageReport.TableReference::table)
                .containsExactly("TB_DEPT", "TB_USER");
        assertThat(usages(report, "USE_YN")).allSatisfy(usage -> assertThat(usage.line()).isPositive());
    }

    @Test
    void ibatisSubstitutionAndJavaStringSqlArePartialButStillRead() throws Exception {
        write("sqlmap/Code.xml", """
                <?xml version="1.0" encoding="UTF-8"?>
                <!DOCTYPE sqlMap PUBLIC "-//ibatis.apache.org//DTD SQL Map 2.0//EN" "http://ibatis.apache.org/dtd/sql-map-2.dtd">
                <sqlMap namespace="Code">
                  <select id="list" resultClass="egovMap">
                    SELECT CODE_ID, CODE_NM FROM TB_CODE WHERE CL_CODE = #clCode# ORDER BY $sortColumn$
                  </select>
                </sqlMap>
                """);
        write("src/egov/user/UserDAO.java", """
                package egov.user;
                public class UserDAO {
                    String find(String id) {
                        String sql = "SELECT USER_NM FROM TB_USER WHERE USER_ID = '" + id + "'";
                        return sql;
                    }
                }
                """);

        AppUsageReport report = scanner.scan(root);

        assertThat(report.partialFiles()).containsExactlyInAnyOrder(
                new PartialFile("sqlmap/Code.xml", "SQL_TEXT_SUBSTITUTION"),
                new PartialFile("src/egov/user/UserDAO.java", "JAVA_STRING_SQL"));
        assertThat(usages(report, "CL_CODE")).extracting(UsageEvidence::kind, UsageEvidence::detail)
                .contains(tuple("SQL_BINDING", "clCode"));
        assertThat(report.tables()).extracting(AppUsageReport.TableReference::table).contains("TB_CODE", "TB_USER");
    }

    @Test
    void javaFieldsCarryTheirCommentLabelsAndConstantsHideCredentialValues() throws Exception {
        write("src/egov/user/UserVO.java", """
                package egov.user;
                import java.util.Date;
                public class UserVO {
                    /** 사용자 아이디 */
                    private String userId;
                    // 등록 일시
                    private Date regDt;
                    @Column(name = "STTS_CD")
                    private String status;
                    private UserDAO userDAO;
                    public static final String STATUS_APPROVED = "A";
                    private static final String DB_PASSWORD = "secret-value";
                }
                """);
        write("src/egov/user/Stat.java", """
                package egov.user;
                public enum Stat {
                    APPROVED("A"), REJECTED("R");
                    private final String code;
                    Stat(String code) { this.code = code; }
                }
                """);
        write("src/egov/user/UserController.java", """
                package egov.user;
                @Controller
                public class UserController {
                    @RequestMapping("/user/list.do")
                    public String list() { return "user/list"; }
                }
                """);

        AppUsageReport report = scanner.scan(root);

        assertThat(usages(report, "USER_ID")).extracting(UsageEvidence::kind, UsageEvidence::owner,
                        UsageEvidence::label)
                .containsExactly(tuple("VO_FIELD", "UserVO", "사용자 아이디"));
        assertThat(usages(report, "REG_DT")).extracting(UsageEvidence::label).containsExactly("등록 일시");
        assertThat(usages(report, "STTS_CD")).extracting(UsageEvidence::detail).containsExactly("status");
        assertThat(report.columns()).extracting(ColumnUsage::column).doesNotContain("USER_DAO", "USER_D_A_O");
        assertThat(report.codeConstants()).extracting(AppUsageReport.CodeConstant::name,
                        AppUsageReport.CodeConstant::value)
                .contains(tuple("STATUS_APPROVED", "A"), tuple("DB_PASSWORD", null),
                        tuple("APPROVED", "A"), tuple("REJECTED", "R"));
        assertThat(report.requestPaths()).extracting(AppUsageReport.RequestPath::requestPath)
                .contains("/user/list.do");
        assertThat(new CollectionArtifactCodec().writeAppUsage(report)).doesNotContain("secret-value");
    }

    @Test
    void screensPairLabelsWithFieldsReadOptionsAndDecodeLegacyEncodings() throws Exception {
        Files.createDirectories(root.resolve("WEB-INF/jsp/user"));
        Files.write(root.resolve("WEB-INF/jsp/user/userForm.jsp"), """
                <%@ page contentType="text/html; charset=EUC-KR" %>
                <form action="/user/save.do" method="post">
                <table>
                <tr><th>사용자명</th><td><input type="text" name="userNm"/></td></tr>
                <tr><th>상태</th><td><select name="statCd"><option value="A">승인</option><option value="R">반려</option></select></td></tr>
                </table>
                <label for="hpNo">휴대전화</label><input name="hpNo" value="010-9999-8888"/>
                <input type="radio" name="useYn" value="Y"> 사용
                </form>
                """.getBytes(Charset.forName("MS949")));
        write("WEB-INF/jsp/user/userList.jsp", """
                <table><tr><th>번호</th><th>등록일</th></tr>
                <c:forEach items="${list}" var="item"><tr><td>${item.rn}</td><td>${item.regDt}</td></tr></c:forEach>
                </table>
                """);

        AppUsageReport report = scanner.scan(root);

        assertThat(report.files().screens()).isEqualTo(2);
        assertThat(usages(report, "USER_NM")).extracting(UsageEvidence::kind, UsageEvidence::label)
                .containsExactly(tuple("SCREEN_LABEL", "사용자명"));
        assertThat(usages(report, "STAT_CD")).extracting(UsageEvidence::kind, UsageEvidence::value,
                        UsageEvidence::label)
                .contains(tuple("SCREEN_LABEL", null, "상태"), tuple("SELECT_OPTION", "A", "승인"),
                        tuple("SELECT_OPTION", "R", "반려"));
        assertThat(usages(report, "HP_NO")).extracting(UsageEvidence::label).contains("휴대전화");
        assertThat(usages(report, "USE_YN")).extracting(UsageEvidence::value, UsageEvidence::label)
                .contains(tuple("Y", "사용"));
        assertThat(usages(report, "REG_DT")).extracting(UsageEvidence::kind, UsageEvidence::label)
                .containsExactly(tuple("LIST_COLUMN_LABEL", "등록일"));
        assertThat(report.requestPaths()).extracting(AppUsageReport.RequestPath::requestPath)
                .contains("/user/save.do");
        assertThat(new CollectionArtifactCodec().writeAppUsage(report)).doesNotContain("010-9999-8888");
    }

    @Test
    void configurationIsNeverReadAndNothingIsJudgedUnusedOrIgnored() throws Exception {
        write("src/main/resources/globals.properties", "Globals.Password=topsecret\n");
        write("src/main/resources/context-datasource.xml", """
                <beans><bean id="ds"><property name="password" value="dbsecret"/></bean></beans>
                """);
        write("src/main/resources/context-security.xml", """
                <beans><http><intercept-url pattern="/admin/**" access="hasRole('ROLE_ADMIN')"/></http></beans>
                """);
        write("db/legacy.sql", "SELECT * FROM TB_USER WHERE HP_NO = '010-1234-5678';\n");
        write(".git/config", "[remote] url = https://user:token@example.invalid/repo\n");
        Files.write(root.resolve("legacy.zip"), new byte[] {80, 75, 3, 4});

        AppUsageReport report = scanner.scan(root);
        String artifact = new CollectionArtifactCodec().writeAppUsage(report);

        assertThat(report.files().configNotRead()).isEqualTo(1);
        assertThat(report.files().xmlOther()).isEqualTo(2);
        assertThat(report.accessRules()).extracting(AppUsageReport.AccessRule::pattern,
                        AppUsageReport.AccessRule::access)
                .containsExactly(tuple("/admin/**", "hasRole('ROLE_ADMIN')"));
        assertThat(usages(report, "HP_NO")).extracting(UsageEvidence::value).containsExactly("[REDACTED:PHONE]");
        assertThat(report.partialFiles()).contains(new PartialFile("legacy.zip", "ARCHIVE_NOT_EXTRACTED"));
        assertThat(artifact).doesNotContain("topsecret", "dbsecret", "010-1234-5678", "token@", "IGNORE",
                "UNUSED");
    }

    @Test
    void buildOutputWithoutSourceIsPartial() throws Exception {
        Files.createDirectories(root.resolve("WEB-INF/classes"));
        Files.write(root.resolve("WEB-INF/classes/Foo.class"), new byte[] {(byte) 0xca, (byte) 0xfe});

        AppUsageReport report = scanner.scan(root);

        assertThat(report.status()).isEqualTo("PARTIAL");
        assertThat(report.partialFiles()).containsExactly(new PartialFile(".", "BUILD_OUTPUT_WITHOUT_SOURCE"));
    }

    @Test
    void everyFileKindIsCountedExactlyAndScriptsAreSplitOutsideQuotes() throws Exception {
        write("db/init.sql", "SELECT A FROM TB_ONE WHERE ONE_CD = 'a;b';\n\nSELECT B FROM TB_TWO\n WHERE TWO_CD = 'T'\n");
        write("src/A.java", "class A {}\n");
        write("web/a.jsp", "<p>a</p>\n");
        write("web/b.html", "<p>b</p>\n");
        write("map/M.xml", "<mapper><select id=\"x\">SELECT 1 FROM TB_M</select></mapper>");
        write("conf/app.yml", "password: x\n");
        write("conf/.env.local", "TOKEN=x\n");
        Files.write(root.resolve("lib.jar"), new byte[] {1});
        Files.write(root.resolve("dump.tar"), new byte[] {1});
        write("README.md", "readme\n");

        AppUsageReport report = scanner.scan(root);

        assertThat(report.files()).isEqualTo(new AppUsageReport.FileCounts(10, 1, 1, 1, 2, 0, 2, 1, 1, 0, 1));
        assertThat(usages(report, "ONE_CD")).extracting(UsageEvidence::value, UsageEvidence::line)
                .containsExactly(tuple("a;b", 1));
        assertThat(usages(report, "TWO_CD")).extracting(UsageEvidence::value, UsageEvidence::line)
                .containsExactly(tuple("T", 4));
        assertThat(report.partialFiles()).containsExactly(new PartialFile("dump.tar", "ARCHIVE_NOT_EXTRACTED"));
        assertThat(report.status()).isEqualTo("PARTIAL");
    }

    @Test
    void encodingsBomTooLargeAndUndecodableFilesAreHandledExplicitly() throws Exception {
        byte[] bom = {(byte) 0xef, (byte) 0xbb, (byte) 0xbf};
        byte[] body = "SELECT X FROM TB_BOM WHERE BOM_CD = 'B'".getBytes(StandardCharsets.UTF_8);
        byte[] withBom = new byte[bom.length + body.length];
        System.arraycopy(bom, 0, withBom, 0, bom.length);
        System.arraycopy(body, 0, withBom, bom.length, body.length);
        Files.write(root.resolve("bom.sql"), withBom);
        Files.write(root.resolve("broken.jsp"), new byte[] {(byte) 0x81, (byte) 0x0a, (byte) 0x81});
        Files.write(root.resolve("huge.sql"), new byte[(int) AppSourceScanner.MAX_FILE_BYTES + 1]);
        Files.write(root.resolve("edge.sql"), new byte[(int) AppSourceScanner.MAX_FILE_BYTES]);

        AppUsageReport report = scanner.scan(root);

        assertThat(usages(report, "BOM_CD")).extracting(UsageEvidence::value).containsExactly("B");
        assertThat(report.partialFiles()).containsExactly(
                new PartialFile("broken.jsp", "UNDECODABLE"), new PartialFile("huge.sql", "TOO_LARGE"));
        assertThat(AppSourceScanner.decode("한글".getBytes(Charset.forName("MS949")))).isEqualTo("한글");
        assertThat(AppSourceScanner.decode("plain".getBytes(StandardCharsets.UTF_8))).isEqualTo("plain");
    }

    @Test
    void javaAnnotationSqlMultiLineDocsAndConcatenationAreRead() throws Exception {
        write("src/egov/CodeMapper.java", """
                package egov;
                public interface CodeMapper {
                    @Select("SELECT CODE_NM FROM TB_CODE WHERE CODE_SE = 'S'")
                    String find();
                    @Select("SELECT * FROM TB_HIST WHERE HIST_ID = " + "#{id}")
                    String hist();
                }
                """);
        write("src/egov/CodeVO.java", """
                package egov;
                public class CodeVO {
                    /**
                     * 코드 구분
                     * @since 1.0
                     */
                    private java.lang.String codeSe;
                    private static final int MAX_LEN = 20;
                    protected java.math.BigDecimal amt;
                }
                """);

        AppUsageReport report = scanner.scan(root);

        assertThat(usages(report, "CODE_SE")).extracting(UsageEvidence::kind, UsageEvidence::value,
                        UsageEvidence::label, UsageEvidence::line)
                .containsExactly(tuple("SQL_LITERAL", "S", null, 3),
                        tuple("VO_FIELD", null, "코드 구분", 7));
        assertThat(usages(report, "AMT")).extracting(UsageEvidence::kind).containsExactly("VO_FIELD");
        assertThat(report.codeConstants()).extracting(AppUsageReport.CodeConstant::name,
                        AppUsageReport.CodeConstant::value, AppUsageReport.CodeConstant::line)
                .containsExactly(tuple("MAX_LEN", "20", 8));
        assertThat(report.partialFiles()).containsExactly(
                new PartialFile("src/egov/CodeMapper.java", "JAVA_CONCATENATED_SQL"));
        assertThat(report.tables()).extracting(AppUsageReport.TableReference::table)
                .containsExactly("TB_CODE", "TB_HIST");
    }

    @Test
    void brokenXmlIsPartialAndExternalEntitiesAreNeverRead() throws Exception {
        Path secret = root.resolve("secret.txt");
        Files.writeString(secret, "XXE-SECRET-VALUE");
        write("map/Bad.xml", "<mapper><select>SELECT 1 FROM TB_BAD</mapper>");
        write("map/Xxe.xml", "<?xml version=\"1.0\"?>\n<!DOCTYPE mapper [<!ENTITY xxe SYSTEM \""
                + secret.toUri() + "\">]>\n<mapper><select id=\"x\">SELECT * FROM TB_X WHERE X_CD = '&xxe;'</select></mapper>");
        write("map/Ibatis.xml", """
                <sqlMap><resultMap id="r" class="egov.code.CodeVO"><result column="CODE_ID" property="codeId"/></resultMap>
                <select id="s"><include refid="cols"/>SELECT CODE_ID FROM TB_CODE</select></sqlMap>
                """);

        AppUsageReport report = scanner.scan(root);
        String artifact = new CollectionArtifactCodec().writeAppUsage(report);

        assertThat(report.partialFiles()).contains(new PartialFile("map/Bad.xml", "UNPARSEABLE_XML"));
        assertThat(report.partialFiles()).doesNotContain(new PartialFile("map/Ibatis.xml", "DYNAMIC_SQL"));
        assertThat(artifact).doesNotContain("XXE-SECRET-VALUE");
        assertThat(usages(report, "CODE_ID")).extracting(UsageEvidence::kind, UsageEvidence::owner,
                        UsageEvidence::detail, UsageEvidence::line)
                .containsExactly(tuple("RESULT_MAP", "CodeVO", "codeId", 1));
        assertThat(report.files().sqlMappers() + report.files().xmlOther()).isEqualTo(3);
    }

    @Test
    void screensReadLinksAndSkipCommentedMarkupLongValuesAndExpressions() throws Exception {
        write("web/menu.jsp", """
                <%-- <label for="oldNo">옛 번호</label> --%>
                <!-- <a href="/old/gone.do">gone</a> -->
                <a href="/board/list.do">목록</a>
                <form action="${ctx}/x.do"></form>
                <form action="/board/write.do" method="post">
                <tr><th>구분</th><td><input type="hidden" name="mode"/><input name="seCd"/><input name="seNm"/></td></tr>
                <select name="kind"><option value="${k}">동적</option><option value="ABCDEFGHIJKLMNOPQRSTU">긴값</option>
                <option value="K1">종류1</option></select>
                <form:select path="grade"><form:option value="G1" label="1등급"/></form:select>
                </form>
                """);

        AppUsageReport report = scanner.scan(root);

        assertThat(report.columns()).extracting(ColumnUsage::column).doesNotContain("OLD_NO", "MODE");
        assertThat(report.requestPaths()).extracting(AppUsageReport.RequestPath::requestPath,
                        AppUsageReport.RequestPath::source, AppUsageReport.RequestPath::line)
                .containsExactly(tuple("/board/list.do", "JSP_DO_LINK", 3),
                        tuple("/board/write.do", "JSP_DO_LINK", 5),
                        tuple("/board/write.do", "JSP_FORM_ACTION", 5));
        assertThat(usages(report, "SE_CD")).extracting(UsageEvidence::label, UsageEvidence::line)
                .containsExactly(tuple("구분", 6));
        assertThat(usages(report, "SE_NM")).isEmpty();
        assertThat(usages(report, "KIND")).extracting(UsageEvidence::value, UsageEvidence::label,
                        UsageEvidence::line)
                .containsExactly(tuple("K1", "종류1", 8));
        assertThat(usages(report, "GRADE")).extracting(UsageEvidence::value, UsageEvidence::label)
                .containsExactly(tuple("G1", "1등급"));
    }

    @Test
    void sensitiveEvidenceIsDroppedAndCountedAndOutputIsOrdered() throws Exception {
        write("b/B.java", """
                class B {
                    public static final String SECRET_HINT = "x";
                    @RequestMapping("/b.do")
                    void b() {}
                }
                """);
        write("a/A.sql", "SELECT * FROM TB_A WHERE NOTE_TX = 'password=hunter2'");
        write("a/A.java", """
                class A {
                    public static final String A_CD = "A";
                    @GetMapping("/a.do")
                    void a() {}
                }
                """);

        AppUsageReport report = scanner.scan(root);

        assertThat(report.droppedSensitive()).isEqualTo(1);
        assertThat(usages(report, "NOTE_TX")).isEmpty();
        assertThat(report.codeConstants()).extracting(AppUsageReport.CodeConstant::path,
                        AppUsageReport.CodeConstant::value)
                .containsExactly(tuple("a/A.java", "A"), tuple("b/B.java", null));
        assertThat(report.requestPaths()).extracting(AppUsageReport.RequestPath::path)
                .containsExactly("a/A.java", "b/B.java");
    }

    @Test
    void columnKeysFoldCamelCaseAndPropertyPaths() {
        assertThat(UsageCollector.columnKey("URLPath")).isEqualTo("URL_PATH");
        assertThat(UsageCollector.columnKey("userID2")).isEqualTo("USER_ID2");
        assertThat(UsageCollector.columnKey("x")).isEqualTo("X");
        assertThat(UsageCollector.columnKey("a".repeat(64))).isEqualTo("A".repeat(64));
        assertThat(UsageCollector.columnKey("a".repeat(65))).isNull();
        assertThat(UsageCollector.columnKey(null)).isNull();
        assertThat(UsageCollector.columnKey("regDt")).isEqualTo("REG_DT");
        assertThat(UsageCollector.columnKey("searchVO.userID")).isEqualTo("USER_ID");
        assertThat(UsageCollector.columnKey("list[0].hpNo")).isEqualTo("HP_NO");
        assertThat(UsageCollector.columnKey("REG_DT")).isEqualTo("REG_DT");
        assertThat(UsageCollector.columnKey("bad name")).isNull();
    }

    private void write(String relative, String content) throws Exception {
        Path file = root.resolve(relative);
        Files.createDirectories(file.getParent());
        Files.writeString(file, content, StandardCharsets.UTF_8);
    }

    private static List<UsageEvidence> usages(AppUsageReport report, String column) {
        return report.columns().stream().filter(usage -> usage.column().equals(column)).findFirst()
                .map(ColumnUsage::usages).orElse(List.of());
    }
}
