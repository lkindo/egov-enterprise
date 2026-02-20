package egovframework.com.ssi.syi.ims.service.impl;

import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.egovframe.rte.psl.dataaccess.util.EgovMap;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.integration.IntegrationMessage;
import com.company.project.domain.integration.IntegrationMessageItem;
import com.company.project.domain.integration.IntegrationMessageItem.IntegrationMessageItemId;
import com.company.project.domain.integration.IntegrationMessageItemRepository;
import com.company.project.domain.integration.IntegrationMessageRepository;

import egovframework.com.ssi.syi.ims.service.CntcMessage;
import egovframework.com.ssi.syi.ims.service.CntcMessageItem;
import egovframework.com.ssi.syi.ims.service.CntcMessageItemVO;
import egovframework.com.ssi.syi.ims.service.CntcMessageVO;
import egovframework.com.ssi.syi.ims.service.EgovCntcMessageService;
import lombok.RequiredArgsConstructor;

/**
 * ? ?? ??????? ? ?????
 * 
 * @author ???????? ????
 * @since 2009.04.01
 * @version 1.0
 **/
@Service("CntcMessageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovCntcMessageServiceImpl extends EgovAbstractServiceImpl implements EgovCntcMessageService {

	private final IntegrationMessageRepository integrationMessageRepository;
	private final IntegrationMessageItemRepository integrationMessageItemRepository;

	/**
	 * ? ?????.
	 **/
	@Override
	public List<EgovMap> selectCntcMessageList(CntcMessageVO cntcMessageVO) throws Exception {
		List<IntegrationMessage> entities = integrationMessageRepository
				.searchMessages(cntcMessageVO.getSearchKeyword());
		return entities.stream()
				.map(e -> {
					EgovMap map = new EgovMap();
					map.put("cntcMessageId", e.getCntcMessageId());
					map.put("cntcMessageNm", e.getCntcMessageNm());
					map.put("upperCntcMessageId", e.getUpperCntcMessageId());
					return map;
				}).collect(Collectors.toList());
	}

	/**
	 * ? ????????.
	 **/
	@Override
	public int selectCntcMessageListTotCnt(CntcMessageVO cntcMessageVO) throws Exception {
		return (int) integrationMessageRepository.countMessages(cntcMessageVO.getSearchKeyword());
	}

	/**
	 * ??????????.
	 **/
	@Override
	public List<EgovMap> selectCntcMessageItemList(CntcMessageItemVO cntcMessageItemVO) throws Exception {
		List<IntegrationMessageItem> entities = integrationMessageItemRepository
				.searchMessageItems(cntcMessageItemVO.getCntcMessageId(), cntcMessageItemVO.getSearchKeyword());

		return entities.stream()
				.map(e -> {
					EgovMap map = new EgovMap();
					map.put("cntcMessageId", e.getId().getCntcMessageId());
					map.put("itemId", e.getId().getItemId());
					map.put("itemNm", e.getItemNm());
					map.put("itemType", e.getItemType());
					map.put("itemLt", e.getItemLt());
					return map;
				}).collect(Collectors.toList());
	}

	/**
	 * ?????????????.
	 **/
	@Override
	public int selectCntcMessageItemListTotCnt(CntcMessageItemVO cntcMessageItemVO) throws Exception {
		return (int) integrationMessageItemRepository.countMessageItems(cntcMessageItemVO.getCntcMessageId(),
				cntcMessageItemVO.getSearchKeyword());
	}

	/**
	 * ???? ???.
	 **/
	@Override
	public CntcMessage selectCntcMessageDetail(CntcMessage cntcMessage) throws Exception {
		return integrationMessageRepository.findById(cntcMessage.getCntcMessageId())
				.map(e -> {
					CntcMessage res = new CntcMessage();
					res.setCntcMessageId(e.getCntcMessageId());
					res.setCntcMessageNm(e.getCntcMessageNm());
					res.setUpperCntcMessageId(e.getUpperCntcMessageId());
					return res;
				}).orElse(null);
	}

	/**
	 * ??????? ???.
	 **/
	@Override
	public CntcMessageItem selectCntcMessageItemDetail(CntcMessageItem cntcMessageItem) throws Exception {
		IntegrationMessageItemId id = IntegrationMessageItemId.builder()
				.cntcMessageId(cntcMessageItem.getCntcMessageId())
				.itemId(cntcMessageItem.getItemId())
				.build();
		return integrationMessageItemRepository.findById(id)
				.map(e -> {
					CntcMessageItem res = new CntcMessageItem();
					res.setCntcMessageId(e.getId().getCntcMessageId());
					res.setItemId(e.getId().getItemId());
					res.setItemNm(e.getItemNm());
					res.setItemType(e.getItemType());
					res.setItemLt(e.getItemLt());
					return res;
				}).orElse(null);
	}

	/**
	 * ??????.
	 **/
	@Override
	@Transactional
	public void insertCntcMessage(CntcMessage cntcMessage) throws Exception {
		IntegrationMessage entity = IntegrationMessage.builder()
				.cntcMessageId(cntcMessage.getCntcMessageId())
				.cntcMessageNm(cntcMessage.getCntcMessageNm())
				.upperCntcMessageId(cntcMessage.getUpperCntcMessageId())
				.frstRegisterId(cntcMessage.getFrstRegisterId())
				.build();
		integrationMessageRepository.save(entity);
	}

	/**
	 * ?????????.
	 **/
	@Override
	@Transactional
	public void insertCntcMessageItem(CntcMessageItem cntcMessageItem) throws Exception {
		IntegrationMessageItem entity = IntegrationMessageItem.builder()
				.id(IntegrationMessageItemId.builder()
						.cntcMessageId(cntcMessageItem.getCntcMessageId())
						.itemId(cntcMessageItem.getItemId())
						.build())
				.itemNm(cntcMessageItem.getItemNm())
				.itemType(cntcMessageItem.getItemType())
				.itemLt(cntcMessageItem.getItemLt())
				.frstRegisterId(cntcMessageItem.getFrstRegisterId())
				.build();
		integrationMessageItemRepository.save(entity);
	}

	/**
	 * ???????.
	 **/
	@Override
	@Transactional
	public void updateCntcMessage(CntcMessage cntcMessage) throws Exception {
		integrationMessageRepository.findById(cntcMessage.getCntcMessageId())
				.ifPresent(e -> e.update(cntcMessage.getCntcMessageNm(), cntcMessage.getUpperCntcMessageId(),
						cntcMessage.getLastUpdusrId()));
	}

	/**
	 * ??????????.
	 **/
	@Override
	@Transactional
	public void updateCntcMessageItem(CntcMessageItem cntcMessageItem) throws Exception {
		IntegrationMessageItemId id = IntegrationMessageItemId.builder()
				.cntcMessageId(cntcMessageItem.getCntcMessageId())
				.itemId(cntcMessageItem.getItemId())
				.build();
		integrationMessageItemRepository.findById(id)
				.ifPresent(e -> e.update(cntcMessageItem.getItemNm(), cntcMessageItem.getItemType(),
						cntcMessageItem.getItemLt(), cntcMessageItem.getLastUpdusrId()));
	}

	/**
	 * ????????.
	 **/
	@Override
	@Transactional
	public void deleteCntcMessage(CntcMessage cntcMessage) throws Exception {
		integrationMessageRepository.findById(cntcMessage.getCntcMessageId())
				.ifPresent(e -> e.delete(cntcMessage.getLastUpdusrId()));
	}

	/**
	 * ???????????.
	 **/
	@Override
	@Transactional
	public void deleteCntcMessageItem(CntcMessageItem cntcMessageItem) throws Exception {
		IntegrationMessageItemId id = IntegrationMessageItemId.builder()
				.cntcMessageId(cntcMessageItem.getCntcMessageId())
				.itemId(cntcMessageItem.getItemId())
				.build();
		integrationMessageItemRepository.findById(id)
				.ifPresent(e -> e.delete(cntcMessageItem.getLastUpdusrId()));
	}
}
