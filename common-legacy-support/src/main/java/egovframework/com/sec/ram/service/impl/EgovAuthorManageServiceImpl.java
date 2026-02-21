package egovframework.com.sec.ram.service.impl;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

import org.egovframe.rte.fdl.cmmn.EgovAbstractServiceImpl;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.company.project.domain.auth.Authority;
import com.company.project.domain.auth.AuthorityRepository;

import egovframework.com.sec.ram.service.AuthorManage;
import egovframework.com.sec.ram.service.AuthorManageVO;
import egovframework.com.sec.ram.service.EgovAuthorManageService;
import lombok.RequiredArgsConstructor;

/**
 * ?? ???ServiceImpl ?????? ???.
 * 
 * @author ???????? ??
 * @since 2009.06.01
 * @version 1.0
 **/
@Service("egovAuthorManageService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EgovAuthorManageServiceImpl extends EgovAbstractServiceImpl implements EgovAuthorManageService {

	private final AuthorityRepository authorityRepository;

	/**
	 * ??????.
	 **/
	@Override
	public List<AuthorManageVO> selectAuthorList(AuthorManageVO authorManageVO) throws Exception {
		Pageable pageable = PageRequest.of(authorManageVO.getPageIndex() - 1, authorManageVO.getRecordCountPerPage(),
				Sort.by("authorCreatDe").descending());
		Page<Authority> page;
		if (authorManageVO.getSearchKeyword() != null && !authorManageVO.getSearchKeyword().isEmpty()) {
			page = authorityRepository.searchByKeyword(authorManageVO.getSearchKeyword(), pageable);
		} else {
			page = authorityRepository.findAll(pageable);
		}
		return page.getContent().stream().map(this::toVO).collect(Collectors.toList());
	}

	/**
	 * ?????.
	 **/
	@Override
	@Transactional
	public void insertAuthor(AuthorManage authorManage) throws Exception {
		authorityRepository.save(toEntity(authorManage));
	}

	/**
	 * ??????.
	 **/
	@Override
	@Transactional
	public void updateAuthor(AuthorManage authorManage) throws Exception {
		authorityRepository.save(toEntity(authorManage));
	}

	/**
	 * ???????.
	 **/
	@Override
	@Transactional
	public void deleteAuthor(AuthorManage authorManage) throws Exception {
		authorityRepository.deleteById(authorManage.getAuthorCode());
	}

	/**
	 * ?????.
	 **/
	@Override
	public AuthorManageVO selectAuthor(AuthorManageVO authorManageVO) throws Exception {
		return authorityRepository.findById(authorManageVO.getAuthorCode())
				.map(this::toVO)
				.orElseThrow(() -> processException("info.nodata.msg"));
	}

	/**
	 * ????? ???.
	 **/
	@Override
	public int selectAuthorListTotCnt(AuthorManageVO authorManageVO) throws Exception {
		if (authorManageVO.getSearchKeyword() != null && !authorManageVO.getSearchKeyword().isEmpty()) {
			return (int) authorityRepository.searchByKeyword(authorManageVO.getSearchKeyword(), PageRequest.of(0, 1))
					.getTotalElements();
		}
		return (int) authorityRepository.count();
	}

	/**
	 * ???????.
	 **/
	@Override
	public List<AuthorManageVO> selectAuthorAllList(AuthorManageVO authorManageVO) throws Exception {
		return authorityRepository.findAll().stream().map(this::toVO).collect(Collectors.toList());
	}

	private AuthorManageVO toVO(Authority entity) {
		AuthorManageVO vo = new AuthorManageVO();
		vo.setAuthorCode(entity.getAuthorCode());
		vo.setAuthorNm(entity.getAuthorNm());
		vo.setAuthorDc(entity.getAuthorDc());
		if (entity.getAuthorCreatDe() != null) {
			vo.setAuthorCreatDe(entity.getAuthorCreatDe().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
		}
		return vo;
	}

	private Authority toEntity(AuthorManage vo) {
		return Authority.builder()
				.authorCode(vo.getAuthorCode())
				.authorNm(vo.getAuthorNm())
				.authorDc(vo.getAuthorDc())
				.build();
	}
}
