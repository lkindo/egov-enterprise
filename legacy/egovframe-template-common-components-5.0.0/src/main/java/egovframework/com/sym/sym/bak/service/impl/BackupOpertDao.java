package egovframework.com.sym.sym.bak.service.impl;
import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.sym.bak.service.BackupOpert;
import egovframework.com.sym.sym.bak.service.BackupSchdulDfk;

/**
 * 諛깆뾽?묒뾽愿由ъ뿉 ???DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
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
@Repository("backupOpertDao")
public class BackupOpertDao extends EgovComAbstractDAO {

	/**
	 * 諛깆뾽?묒뾽????젣?쒕떎.
	 *
	 * @param backupOpert    ??젣??諛깆뾽?묒뾽 VO
	 * @exception Exception Exception
	 */
	public void deleteBackupOpert(BackupOpert backupOpert)
	  throws Exception{
		// slave ?뚯씠釉???젣
		delete("BackupOpertDao.deleteBackupSchdulDfk", backupOpert.getBackupOpertId());
		// master ?뚯씠釉???젣
		delete("BackupOpertDao.deleteBackupOpert", backupOpert);

	}

	/**
	 * 諛깆뾽?묒뾽???깅줉?쒕떎.
	 *
	 * @param backupOpert ??ν븷 諛깆뾽?묒뾽 VO
	 * @exception Exception Exception
	 */
	public void insertBackupOpert(BackupOpert backupOpert)
	  throws Exception{
		// master ?뚯씠釉??몄꽌??
		insert("BackupOpertDao.insertBackupOpert", backupOpert);
		// slave ?뚯씠釉??몄꽌??
		if (backupOpert.getExecutSchdulDfkSes() != null && backupOpert.getExecutSchdulDfkSes().length != 0) {
			String backupOpertId = backupOpert.getBackupOpertId();
			String [] dfkSes = backupOpert.getExecutSchdulDfkSes();
			for (String element : dfkSes) {
				BackupSchdulDfk backupSchdulDfk = new BackupSchdulDfk();
				backupSchdulDfk.setBackupOpertId(backupOpertId);
				backupSchdulDfk.setExecutSchdulDfkSe(element);
				insert("BackupOpertDao.insertBackupSchdulDfk", backupSchdulDfk);
			}
		}

	}

	/**
	 * 諛깆뾽?묒뾽?뺣낫瑜??곸꽭議고쉶 ?쒕떎.
	 * @return 諛깆뾽?묒뾽?뺣낫
	 *
	 * @param backupOpert    議고쉶??KEY媛 ?덈뒗 諛깆뾽?묒뾽 VO
	 * @exception Exception Exception
	 */
	public BackupOpert selectBackupOpert(BackupOpert backupOpert)
	  throws Exception{
		BackupOpert result = (BackupOpert)selectOne("BackupOpertDao.selectBackupOpert", backupOpert);
		// ?ㅼ?以꾩슂?쇱젙蹂대? 媛?몄삩??
		List<BackupSchdulDfk> dfkSeList = selectList("BackupOpertDao.selectBackupSchdulDfkList", result.getBackupOpertId());
		String [] dfkSes = new String [dfkSeList.size()];
		for (int j = 0; j < dfkSeList.size(); j++) {
			dfkSes[j] = dfkSeList.get(j).getExecutSchdulDfkSe();
		}
		result.setExecutSchdulDfkSes(dfkSes);
		// ?붾㈃?쒖떆???ㅽ뻾?ㅼ?以??띿꽦??留뚮뱺??
		result.makeExecutSchdul(dfkSeList);

		return result ;
	}

	/**
     * 諛깆뾽?묒뾽?뺣낫紐⑸줉??議고쉶?쒕떎.
     *
     * @return 諛깆뾽?묒뾽紐⑸줉
     *
     * @param searchVO 議고쉶議곌굔????λ맂 VO
     * @exception Exception Exception
     */
    public List<BackupOpert> selectBackupOpertList(BackupOpert searchVO) throws Exception {
        List<BackupOpert> resultList = selectList("BackupOpertDao.selectBackupOpertList", searchVO);

        for (BackupOpert result : resultList) {
            // ?ㅼ?以꾩슂?쇱젙蹂대? 媛?몄삩??
            List<BackupSchdulDfk> dfkSeList = selectList("BackupOpertDao.selectBackupSchdulDfkList",
                    result.getBackupOpertId());
            result.setExecutSchdulDfkSes(
                    dfkSeList.stream().map(BackupSchdulDfk::getExecutSchdulDfkSe).toArray(String[]::new));
            // ?붾㈃?쒖떆???ㅽ뻾?ㅼ?以??띿꽦??留뚮뱺??
            result.makeExecutSchdul(dfkSeList);
        }
        return resultList;
    }

	/**
	 * 諛깆뾽?묒뾽 紐⑸줉 ?꾩껜 嫄댁닔瑜??? 議고쉶?쒕떎.
	 * @return 紐⑸줉嫄댁닔
	 *
	 * @param searchVO    議고쉶???뺣낫媛 ?닿릿 VO
	 * @exception Exception Exception
	 */
	public int selectBackupOpertListCnt(BackupOpert searchVO)
	  throws Exception{
		return (Integer)selectOne("BackupOpertDao.selectBackupOpertListCnt", searchVO);
	}

	/**
	 * 諛깆뾽?묒뾽?뺣낫瑜??섏젙?쒕떎.
	 *
	 * @param backupOpert    ?섏젙???諛깆뾽?묒뾽 VO
	 * @exception Exception Exception
	 */
	public void updateBackupOpert(BackupOpert backupOpert)
	  throws Exception{
		update("BackupOpertDao.updateBackupOpert", backupOpert);
		// slave ?뚯씠釉???젣
		delete("BackupOpertDao.deleteBackupSchdulDfk", backupOpert.getBackupOpertId());
		// slave ?뚯씠釉??몄꽌??
		if (backupOpert.getExecutSchdulDfkSes() != null && backupOpert.getExecutSchdulDfkSes().length != 0) {
			String backupOpertId = backupOpert.getBackupOpertId();
			String [] dfkSes = backupOpert.getExecutSchdulDfkSes();
			for (String element : dfkSes) {
				BackupSchdulDfk backupSchdulDfk = new BackupSchdulDfk();
				backupSchdulDfk.setBackupOpertId(backupOpertId);
				backupSchdulDfk.setExecutSchdulDfkSe(element);
				insert("BackupOpertDao.insertBackupSchdulDfk", backupSchdulDfk);
			}
		}
	}

}
