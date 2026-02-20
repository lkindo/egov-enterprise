package egovframework.com.sym.sym.bak.service.impl;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sym.sym.bak.service.BackupOpert;
import egovframework.com.sym.sym.bak.service.BackupResult;
import egovframework.com.sym.sym.bak.service.EgovBackupOpertService;
import jakarta.annotation.Resource;

/**
 * 諛깆뾽?묒뾽愿由ъ뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Service("egovBackupOpertService")
public class EgovBackupOpertServiceImpl extends EgovAbstractServiceImpl implements EgovBackupOpertService {

	/**
	 * 諛깆뾽?묒뾽DAO
	 */
	@Resource(name = "backupOpertDao")
	private BackupOpertDao backupOpertDao;

	/**
	 * 諛깆뾽寃곌낵DAO
	 */
	@Resource(name = "backupResultDao")
	private BackupResultDao backupResultDao;

	/**
	 * 諛깆뾽?묒뾽????젣?쒕떎.
	 * @param backupOpert    ??젣???諛깆뾽?묒뾽model
	 * @exception Exception Exception
	 */
	@Override
	public void deleteBackupOpert(BackupOpert backupOpert)
	  throws Exception{
		backupOpertDao.deleteBackupOpert(backupOpert);
	}

	/**
	 * 諛깆뾽?묒뾽???깅줉?쒕떎.
	 * @param backupOpert    ?깅줉???諛깆뾽?묒뾽model
	 * @exception Exception Exception
	 */
	@Override
	public void insertBackupOpert(BackupOpert backupOpert)
	  throws Exception{
		backupOpertDao.insertBackupOpert(backupOpert);
	}

	/**
	 * 諛깆뾽?묒뾽???곸꽭議고쉶 ?쒕떎.
	 * @return 諛깆뾽?묒뾽?뺣낫
	 *
	 * @param backupOpert 議고쉶???諛깆뾽?묒뾽model
	 * @exception Exception Exception
	 */
	@Override
	public BackupOpert selectBackupOpert(BackupOpert backupOpert)
	  throws Exception{
		return backupOpertDao.selectBackupOpert(backupOpert);
	}

	/**
     * 諛깆뾽?묒뾽??紐⑸줉??議고쉶 ?쒕떎.
     * 
     * @return 諛깆뾽?묒뾽紐⑸줉
     *
     * @param searchVO 議고쉶?뺣낫媛 ?닿릿 VO
     * @exception Exception Exception
     */
    @Override
    public List<BackupOpert> selectBackupOpertList(BackupOpert searchVO) throws Exception {
        return backupOpertDao.selectBackupOpertList(searchVO);
    }

	/**
	 * 諛깆뾽?묒뾽 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	@Override
	public int selectBackupOpertListCnt(BackupOpert searchVO)
	  throws Exception{
		int cnt = backupOpertDao.selectBackupOpertListCnt(searchVO);
		return cnt;
	}

	/**
	 * 諛깆뾽?묒뾽?뺣낫瑜??섏젙?쒕떎.
	 *
	 * @param backupOpert    ?섏젙???諛깆뾽?묒뾽model
	 * @exception Exception Exception
	 */
	@Override
	public void updateBackupOpert(BackupOpert backupOpert)
	  throws Exception{
		backupOpertDao.updateBackupOpert(backupOpert);
	}

	/**
	 * 諛깆뾽寃곌낵瑜??깅줉?쒕떎.
	 * @param backupResult    ?깅줉???諛깆뾽寃곌낵model
	 * @exception Exception Exception
	 */
	@Override
	public void insertBackupResult(BackupResult backupResult)
	  throws Exception{
		backupResultDao.insertBackupResult(backupResult);
	}

	/**
	 * 諛깆뾽寃곌낵?뺣낫瑜??섏젙?쒕떎.
	 *
	 * @param backupResult    ?섏젙???諛깆뾽寃곌낵model
	 * @exception Exception Exception
	 */
	@Override
	public void updateBackupResult(BackupResult backupResult)
	  throws Exception{
		backupResultDao.updateBackupResult(backupResult);
	}

}