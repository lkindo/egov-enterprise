package egovframework.com.sym.sym.srv.service.impl;
import java.util.List;

import org.springframework.stereotype.Repository;

import egovframework.com.cmm.service.impl.EgovComAbstractDAO;
import egovframework.com.sym.sym.srv.service.Server;
import egovframework.com.sym.sym.srv.service.ServerEqpmn;
import egovframework.com.sym.sym.srv.service.ServerEqpmnRelate;
import egovframework.com.sym.sym.srv.service.ServerEqpmnRelateVO;
import egovframework.com.sym.sym.srv.service.ServerEqpmnVO;
import egovframework.com.sym.sym.srv.service.ServerVO;

/**
 * 媛쒖슂
 * - ?쒕쾭?뺣낫?????DAO ?대옒?ㅻ? ?뺤쓽?쒕떎.
 * 
 * ?곸꽭?댁슜
 * - ?쒕쾭?뺣낫??????깅줉, ?섏젙, ??젣, 議고쉶 ?깆쓽 湲곕뒫???쒓났?쒕떎.
 * - ?쒕쾭?뺣낫??議고쉶湲곕뒫? 紐⑸줉議고쉶, ?곸꽭議고쉶濡?援щ텇?쒕떎.
 * @author lee.m.j
 * @version 1.0
 * @created 28-6-2010 ?ㅼ쟾 10:44:54
 */
@Repository("serverDAO")
public class ServerDAO extends EgovComAbstractDAO {

	/**
	 * ?쒕쾭?λ퉬瑜?愿由ы븯湲??꾪빐 ?깅줉???쒕쾭?λ퉬紐⑸줉??議고쉶?쒕떎.
	 * @param serverEqpmnVO - ?쒕쾭?λ퉬 Vo
	 * @return List - ?쒕쾭?λ퉬 紐⑸줉
	 * 
	 * @param serverEqpmnVO
	 */
	public List<ServerEqpmnVO> selectServerEqpmnList(ServerEqpmnVO serverEqpmnVO) {
		return selectList("serverDAO.selectServerEqpmnList", serverEqpmnVO);
	}

	/**
	 * ?쒕쾭?λ퉬紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param serverEqpmnVO - ?쒕쾭?λ퉬 Vo
	 * @return int - ?쒕쾭?λ퉬 移댁슫????
	 */
	public int selectServerEqpmnListTotCnt(ServerEqpmnVO serverEqpmnVO) throws Exception{
		return (Integer)selectOne("serverDAO.selectServerEqpmnListTotCnt", serverEqpmnVO);
	}

	/**
	 * ?깅줉???쒕쾭?λ퉬???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param serverEqpmnVO - ?쒕쾭?λ퉬 Vo
	 * @return serverEqpmnVO - ?쒕쾭?λ퉬 Vo
	 */
	public ServerEqpmnVO selectServerEqpmn(ServerEqpmnVO serverEqpmnVO) throws Exception{
		return (ServerEqpmnVO) selectOne("serverDAO.selectServerEqpmn", serverEqpmnVO);
	}

	/**
	 * ?쒕쾭?λ퉬?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param serverEqpmn - ?쒕쾭?λ퉬 model
	 */
	public void insertServerEqpmn(ServerEqpmn serverEqpmn) throws Exception {
		insert("serverDAO.insertServerEqpmn", serverEqpmn);
	}

	/**
	 * 湲??깅줉???쒕쾭?λ퉬?뺣낫瑜??섏젙?쒕떎.
	 * @param serverEqpmn - ?쒕쾭?λ퉬 model
	 */
	public void updateServerEqpmn(ServerEqpmn serverEqpmn) throws Exception {
		update("serverDAO.updateServerEqpmn", serverEqpmn);
	}

	/**
	 * 湲??깅줉???쒕쾭?λ퉬?뺣낫瑜???젣?쒕떎.
	 * @param serverEqpmn - ?쒕쾭?λ퉬 model
	 */
	public void deleteServerEqpmn(ServerEqpmn serverEqpmn) throws Exception {
		delete("serverDAO.deleteServerEqpmn", serverEqpmn);
	}

	/**
	 * ?쒕쾭?뺣낫瑜?愿由ы븯湲??꾪빐 ?깅줉???쒕쾭紐⑸줉??議고쉶?쒕떎.
	 * @param serverVO - ?쒕쾭 Vo
	 * @return List - ?쒕쾭 紐⑸줉
	 */
	public List<ServerVO> selectServerList(ServerVO serverVO) throws Exception {
		return selectList("serverDAO.selectServerList", serverVO);
	}

	/**
	 * @param serverVO - ?쒕쾭 Vo
	 * @return int - ?쒕쾭 移댁슫????
	 * @exception Exception
	 */
	public int selectServerListTotCnt(ServerVO serverVO) throws Exception {
		return (Integer)selectOne("serverDAO.selectServerListTotCnt", serverVO);
	}

	/**
	 * ?깅줉???쒕쾭???곸꽭?뺣낫瑜?議고쉶?쒕떎.
	 * @param serverVO - ?쒕쾭 Vo
	 * @return serverVO - ?쒕쾭 Vo
	 */
	public ServerVO selectServer(ServerVO serverVO) throws Exception {
		return (ServerVO) selectOne("serverDAO.selectServer", serverVO);
	}

	/**
	 * ?쒕쾭???깅줉???쒕쾭?λ퉬紐⑸줉??議고쉶?쒕떎.
	 * @param serverVO - ?쒕쾭 Vo
	 * @return List - ?쒕쾭?λ퉬 紐⑸줉
	 */
	public List<ServerEqpmnVO> selectServerEqpmnRelateDetail(ServerVO serverVO) throws Exception {
		return selectList("serverDAO.selectServerEqpmnRelateDetail", serverVO);
	}
	
	/**
	 * ?쒕쾭???깅줉???쒕쾭?λ퉬紐⑸줉??移댁슫?몃? 議고쉶?쒕떎.
	 * @param serverVO - ?쒕쾭 Vo
	 * @return int - ?쒕쾭???깅줉???쒕쾭?λ퉬 移댁슫????
	 */
	public int selectServerEqpmnRelateDetailTotCnt(ServerVO serverVO) throws Exception {
		return (Integer)selectOne("serverDAO.selectServerEqpmnRelateDetailTotCnt", serverVO);
	}	
	
	/**
	 * ?쒕쾭?뺣낫瑜??좉퇋濡??깅줉?쒕떎.
	 * @param server - ?쒕쾭 model
	 */
	public void insertServer(Server server) throws Exception {
		insert("serverDAO.insertServer", server);
	}

	/**
	 * 湲??깅줉???쒕쾭?뺣낫瑜??섏젙?쒕떎.
	 * @param server - ?쒕쾭 model
	 */
	public void updateServer(Server server) throws Exception {
		update("serverDAO.updateServer", server);
	}

	/**
	 * 湲??깅줉???쒕쾭?뺣낫瑜???젣?쒕떎.
	 * @param server - ?쒕쾭 model
	 */
	public void deleteServer(Server server) throws Exception {
		delete("serverDAO.deleteServer", server);
	}

	/**
	 * ?쒕쾭?λ퉬愿怨꾩젙蹂대? 愿由ы븯湲??꾪빐 ????쒕쾭?λ퉬紐⑸줉??議고쉶?쒕떎.
	 * @param serverEqpmnRelateVO - ?쒕쾭?λ퉬愿怨?Vo
	 * @return List - ?쒕쾭?λ퉬 紐⑸줉
	 */
	public List<ServerEqpmnRelateVO> selectServerEqpmnRelateList(ServerEqpmnRelateVO serverEqpmnRelateVO) throws Exception {
		return selectList("serverDAO.selectServerEqpmnRelateList", serverEqpmnRelateVO);
	}

	/**
	 * ?쒕쾭?λ퉬愿怨????紐⑸줉 珥?媛쒖닔瑜?議고쉶?쒕떎.
	 * @param serverEqpmnRelateVO - ?쒕쾭?λ퉬愿怨?Vo
	 * @return int - ?쒕쾭?λ퉬愿怨?移댁슫????
	 */
	public int selectServerEqpmnRelateListTotCnt(ServerEqpmnRelateVO serverEqpmnRelateVO) throws Exception {
		return (Integer)selectOne("serverDAO.selectServerEqpmnRelateListTotCnt", serverEqpmnRelateVO);
	}

	/**
	 * ?쒕쾭?λ퉬愿怨꾩젙蹂대? ?좉퇋濡??깅줉?쒕떎.
	 * @param serverEqpmnRelate - ?쒕쾭?λ퉬愿怨?model
	 */
	public void insertServerEqpmnRelate(ServerEqpmnRelate serverEqpmnRelate) throws Exception {
		insert("serverDAO.insertServerEqpmnRelate", serverEqpmnRelate);
	}

	/**
	 * 湲??깅줉???쒕쾭?λ퉬愿怨꾩젙蹂대? ??젣?쒕떎.
	 * @param serverEqpmnRelate - ?쒕쾭?λ퉬愿怨?model
	 */
	public void deleteServerEqpmnRelate(ServerEqpmnRelate serverEqpmnRelate) throws Exception {
		delete("serverDAO.deleteServerEqpmnRelate", serverEqpmnRelate);
	}

}