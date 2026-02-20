package egovframework.com.sym.sym.bak.service;

import java.util.List;

/**
 * 諛깆뾽?묒뾽愿由ъ뿉 ???Service Interface瑜??뺤쓽?쒕떎.
 *
 * @author 源吏꾨쭔
 * @since 2010.06.21
 * @version 1.0
 * @updated 21-6-2010 ?ㅼ쟾 10:27:13
 * @see
 * <pre>
 * == 媛쒖젙?대젰(Modification Information) ==
 *
 *   ?섏젙??      ?섏젙??          ?섏젙?댁슜
 *  -------     --------    ---------------------------
 *  2010.06.21   源吏꾨쭔     理쒖큹 ?앹꽦
 * </pre>
 */
public interface EgovBackupOpertService {

	/**
	 * 諛깆뾽?묒뾽?? ??젣?쒕떎.
	 *
	 * @param backupOpert    ??젣???諛깆뾽?묒뾽model
	 * @exception Exception Exception
	 */
	public void deleteBackupOpert(BackupOpert backupOpert) throws Exception;

	/**
	 * 諛깆뾽?묒뾽???깅줉?쒕떎.
	 *
	 * @param backupOpert    ?깅줉???諛깆뾽?묒뾽model
	 * @exception Exception Exception
	 */
	public void insertBackupOpert(BackupOpert backupOpert) throws Exception;

	/**
	 * 諛깆뾽?묒뾽?? ?곸꽭議고쉶 ?쒕떎.
	 * @return 諛깆뾽?묒뾽?뺣낫
	 *
	 * @param backupOpert    議고쉶???諛깆뾽?묒뾽model
	 * @exception Exception Exception
	 */
	public BackupOpert selectBackupOpert(BackupOpert backupOpert) throws Exception;

	/**
     * 諛깆뾽?묒뾽 紐⑸줉??議고쉶?쒕떎.
     * 
     * @return 諛깆뾽?묒뾽紐⑸줉
     *
     * @param searchVO 議고쉶議곌굔VO
     * @exception Exception Exception
     */
    public List<BackupOpert> selectBackupOpertList(BackupOpert searchVO) throws Exception;

	/**
	 * 諛깆뾽?묒뾽 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	public int selectBackupOpertListCnt(BackupOpert searchVO) throws Exception;

	/**
	 * 諛깆뾽?묒뾽???섏젙?쒕떎.
	 *
	 * @param backupOpert    ?섏젙???諛깆뾽?묒뾽model
	 * @exception Exception Exception
	 */
	public void updateBackupOpert(BackupOpert backupOpert) throws Exception;

	/**
	 * 諛깆뾽寃곌낵瑜??깅줉?쒕떎.
	 * @param backupResult    ?깅줉???諛깆뾽寃곌낵model
	 * @exception Exception Exception
	 */
	public void insertBackupResult(BackupResult backupResult) throws Exception;

	/**
	 * 諛깆뾽寃곌낵?뺣낫瑜??섏젙?쒕떎.
	 *
	 * @param backupResult    ?섏젙???諛깆뾽寃곌낵model
	 * @exception Exception Exception
	 */
	public void updateBackupResult(BackupResult backupResult) throws Exception;

}