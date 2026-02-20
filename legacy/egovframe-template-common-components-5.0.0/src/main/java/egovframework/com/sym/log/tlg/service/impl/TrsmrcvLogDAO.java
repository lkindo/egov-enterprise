package egovframework.com.sym.log.tlg.service.impl;

import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.log.tlg.service.TrsmrcvLog;

/**
 * @Class Name : TrsmrcvLogDAO.java
 * @Description : ?≪닔??濡쒓렇 愿由щ? ?꾪븳 ?곗씠???묎렐 ?대옒??
 * @Modification Information
 *
 *    ?섏젙??        ?섏젙??        ?섏젙?댁슜
 *    -------        -------     -------------------
 *    2009. 3. 11.   ?댁궪??        理쒖큹?앹꽦
 *    2011. 7. 01.   ?닿린??        ?⑦궎吏 遺꾨━(sym.log -> sym.log.tlg)
 *
 * @author 怨듯넻 ?쒕퉬??媛쒕컻? ?댁궪??
 * @since 2009. 3. 11.
 * @version
 * @see
 *
 */
@Repository("trsmrcvLogDAO")
public class TrsmrcvLogDAO extends EgovComAbstractDAO {

	/**
	 * ?≪닔?좊줈洹몃? 湲곕줉?쒕떎.
	 *
	 * @param TrsmrcvLog
	 * @return
	 * @throws Exception
	 */
	public void logInsertTrsmrcvLog(TrsmrcvLog trsmrcvLog) throws Exception{
		insert("TrsmrcvLogDAO.logInsertTrsmrcvLog", trsmrcvLog);
	}

	/**
	 * ?≪닔??濡쒓렇?뺣낫瑜??붿빟?쒕떎.
	 *
	 * @param
	 * @return
	 * @throws Exception
	 */
	public void logInsertTrsmrcvLogSummary() throws Exception{
		insert("TrsmrcvLogDAO.logInsertTrsmrcvLogSummary", null);
		delete("TrsmrcvLogDAO.logDeleteTrsmrcvLogSummary", null);
	}

	/**
	 * ?≪닔??濡쒓렇?뺣낫瑜?議고쉶?쒕떎.
	 *
	 * @param trsmrcvLog
	 * @return trsmrcvLog
	 * @throws Exception
	 */
	public TrsmrcvLog selectTrsmrcvLog(TrsmrcvLog trsmrcvLog) throws Exception{

		return (TrsmrcvLog) selectOne("TrsmrcvLogDAO.selectTrsmrcvLog", trsmrcvLog);
	}

	/**
     * ?≪닔??濡쒓렇?뺣낫 紐⑸줉??議고쉶?쒕떎.
     *
     * @param TrsmrcvLog
     * @return
     * @throws Exception
     */
    public List<TrsmrcvLog> selectTrsmrcvLogInf(TrsmrcvLog trsmrcvLog) throws Exception {
        return selectList("TrsmrcvLogDAO.selectTrsmrcvLogInf", trsmrcvLog);
    }

	/**
	 * ?≪닔??濡쒓렇?뺣낫 紐⑸줉???レ옄瑜?議고쉶?쒕떎.
	 * @param TrsmrcvLog
	 * @return
	 * @throws Exception
	 */
	public int selectTrsmrcvLogInfCnt(TrsmrcvLog trsmrcvLog) throws Exception{

		return (Integer)selectOne("TrsmrcvLogDAO.selectTrsmrcvLogInfCnt", trsmrcvLog);
	}

}
