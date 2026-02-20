package egovframework.com.cmm.service;

/**
 *  Class Name : Globals.java
 *  Description : ?쒖뒪??援щ룞 ???꾨줈?쇳떚瑜??듯빐 ?ъ슜???꾩뿭蹂?섎? ?뺤쓽?쒕떎.
 *  Modification Information
 *
 *     ?섏젙??        ?섏젙??                  ?섏젙?댁슜
 *   -------    --------    ---------------------------
 *   2009.01.19    諛뺤???         理쒖큹 ?앹꽦
 *
 *  @author 怨듯넻 ?쒕퉬??媛쒕컻? 諛뺤???
 *  @since 2009. 01. 19
 *  @version 1.0
 *  @see
 *
 */

public class Globals {
	//OS ?좏삎
    public static final String OS_TYPE = EgovProperties.getProperty("Globals.OsType");
    //DB ?좏삎
    public static final String DB_TYPE = EgovProperties.getProperty("Globals.DbType");
    //硫붿씤 ?섏씠吏
    public static final String MAIN_PAGE = EgovProperties.getProperty("Globals.MainPage");
    //ShellFile 寃쎈줈
    public static final String SHELL_FILE_PATH = EgovProperties.getPathProperty("Globals.ShellFilePath");
    //?쇰줈?쇳떚 ?뚯씪 ?꾩튂
    public static final String CONF_PATH = EgovProperties.getPathProperty("Globals.ConfPath");
    //Server?뺣낫 ?꾨줈?쇳떚 ?꾩튂
    public static final String SERVER_CONF_PATH = EgovProperties.getPathProperty("Globals.ServerConfPath");
    //Client?뺣낫 ?꾨줈?쇳떚 ?꾩튂
    public static final String CLIENT_CONF_PATH = EgovProperties.getPathProperty("Globals.ClientConfPath");
    //?뚯씪?щ㎎ ?뺣낫 ?꾨줈?쇳떚 ?꾩튂
    public static final String FILE_FORMAT_PATH = EgovProperties.getPathProperty("Globals.FileFormatPath");

    //?뚯씪 ?낅줈?????뚯씪紐?
	public static final String ORIGIN_FILE_NM = "originalFileName";
	//?뚯씪 ?뺤옣??
	public static final String FILE_EXT = "fileExtension";
	//?뚯씪?ш린
	public static final String FILE_SIZE = "fileSize";
	//?낅줈?쒕맂 ?뚯씪紐?
	public static final String UPLOAD_FILE_NM = "uploadFileName";
	//?뚯씪寃쎈줈
	public static final String FILE_PATH = "filePath";

	//硫붿씪諛쒖넚?붿껌 XML?뚯씪寃쎈줈
	public static final String MAIL_REQUEST_PATH = EgovProperties.getPathProperty("Globals.MailRequestPath");
	//硫붿씪諛쒖넚?묐떟 XML?뚯씪寃쎈줈
	public static final String MAIL_RESPONSE_PATH = EgovProperties.getPathProperty("Globals.MailRResponsePath");

	// G4C ?곌껐??IP (localhost)
	public static final String LOCAL_IP = EgovProperties.getProperty("Globals.LocalIp");

	//SMS ?뺣낫 ?꾨줈?쇳떚 ?꾩튂
	public static final String SMSDB_CONF_PATH = EgovProperties.getPathProperty("Globals.SmsDbConfPath");

	//?뚯씪 ?낅줈??媛???뺤옣?먮뱾
	public static final String FILE_UP_EXTS = EgovProperties.getProperty("Globals.fileUpload.Extensions");
	//?뚯씪 ?낅줈??理쒕? ?⑸웾
	public static final String FILE_UP_MAX_SIZE = EgovProperties.getProperty("Globals.fileUpload.maxFileSize");
}
