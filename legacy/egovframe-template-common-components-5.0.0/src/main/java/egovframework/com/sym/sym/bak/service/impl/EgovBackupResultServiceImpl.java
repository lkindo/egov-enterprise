package egovframework.com.sym.sym.bak.service.impl;
import java.util.List;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.stereotype.Service;

import egovframework.com.sym.sym.bak.service.BackupResult;
import egovframework.com.sym.sym.bak.service.EgovBackupResultService;
import jakarta.annotation.Resource;

/**
 * 諛깆뾽寃곌낵愿由ъ뿉 ???ServiceImpl ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Service("egovBackupResultService")
public class EgovBackupResultServiceImpl extends EgovAbstractServiceImpl implements EgovBackupResultService {

	/**
	 * 諛깆뾽寃곌낵DAO
	 */
	@Resource(name = "backupResultDao")
	private BackupResultDao dao;

	/**
	 * 諛깆뾽寃곌낵????젣?쒕떎.
	 * @param backupResult    ??젣???諛깆뾽寃곌낵model
	 * @exception Exception Exception
	 */
	@Override
	public void deleteBackupResult(BackupResult backupResult)
	  throws Exception{
		dao.deleteBackupResult(backupResult);
	}

	/**
	 * 諛깆뾽寃곌낵???곸꽭議고쉶 ?쒕떎.
	 * @return 諛깆뾽寃곌낵?뺣낫
	 *
	 * @param backupResult 議고쉶???諛깆뾽寃곌낵model
	 * @exception Exception Exception
	 */
	@Override
	public BackupResult selectBackupResult(BackupResult backupResult)
	  throws Exception{
		return dao.selectBackupResult(backupResult);
	}

	/**
	 * 諛깆뾽寃곌낵??紐⑸줉??議고쉶 ?쒕떎.
	 * @return 諛깆뾽寃곌낵紐⑸줉
	 *
	 * @param searchVO 	議고쉶?뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	@Override
	public List<BackupResult> selectBackupResultList(BackupResult searchVO)
	  throws Exception{
		return dao.selectBackupResultList(searchVO);
	}

	/**
	 * 諛깆뾽寃곌낵 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	@Override
	public int selectBackupResultListCnt(BackupResult searchVO)
	  throws Exception{
		int cnt = dao.selectBackupResultListCnt(searchVO);
		return cnt;
	}

}