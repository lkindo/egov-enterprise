package egovframework.com.cmm.service;

/**
 *  Class Name : Globals.java
 *  Description : ????? ?????????? ????????? ???.
 *  Modification Information
 *
 *     ????        ????                  ????
 *   -------    --------    ---------------------------
 *   2009.01.19    ???         ????
 *
 *  @author ????????? ???
 *  @since 2009. 01. 19
 *  @version 1.0
 *  @see
 *
 **/

public class Globals {
	//OS ?
    public static final String OS_TYPE = EgovProperties.getProperty("Globals.OsType");
    //DB ?
    public static final String DB_TYPE = EgovProperties.getProperty("Globals.DbType");
    //????
    public static final String MAIN_PAGE = EgovProperties.getProperty("Globals.MainPage");
    //ShellFile ?
    public static final String SHELL_FILE_PATH = EgovProperties.getPathProperty("Globals.ShellFilePath");
    //???? ??? ?
    public static final String CONF_PATH = EgovProperties.getPathProperty("Globals.ConfPath");
    //Server? ??? ?
    public static final String SERVER_CONF_PATH = EgovProperties.getPathProperty("Globals.ServerConfPath");
    //Client? ??? ?
    public static final String CLIENT_CONF_PATH = EgovProperties.getPathProperty("Globals.ClientConfPath");
    //???????? ??? ?
    public static final String FILE_FORMAT_PATH = EgovProperties.getPathProperty("Globals.FileFormatPath");

    //??? ??????????
	public static final String ORIGIN_FILE_NM = "originalFileName";
	//??? ???
	public static final String FILE_EXT = "fileExtension";
	//??????
	public static final String FILE_SIZE = "fileSize";
	//???? ????
	public static final String UPLOAD_FILE_NM = "uploadFileName";
	//????
	public static final String FILE_PATH = "filePath";

	//??? XML????
	public static final String MAIL_REQUEST_PATH = EgovProperties.getPathProperty("Globals.MailRequestPath");
	//??? XML????
	public static final String MAIL_RESPONSE_PATH = EgovProperties.getPathProperty("Globals.MailRResponsePath");

	// G4C ???IP (localhost)
	public static final String LOCAL_IP = EgovProperties.getProperty("Globals.LocalIp");

	//SMS ? ??? ?
	public static final String SMSDB_CONF_PATH = EgovProperties.getPathProperty("Globals.SmsDbConfPath");

	//??? ?????????
	public static final String FILE_UP_EXTS = EgovProperties.getProperty("Globals.fileUpload.Extensions");
	//??? ????? ??
	public static final String FILE_UP_MAX_SIZE = EgovProperties.getProperty("Globals.fileUpload.maxFileSize");
}
