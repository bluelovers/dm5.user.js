// ==UserScript==
// @name         DM5漫画阅读器
// @namespace    http://tampermonkey.net/
// @version      2026-01-10
// @description  DM5漫画阅读器，支持键盘导航、自动调整图片大小及显示当前页数。
// @author       bluelovers
// @match        https://www.dm5.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=dm5.com
// @grant        none
// ==/UserScript==

(function ()
{
	'use strict';

	const KEYCODES = { pageup: 33, left: 37, pagedown: 34, right: 39 };

	// ========================================
	// 工具函數
	// ========================================

	/**
	 * 防抖函數 - 延遲執行，在等待期間再次觸發會重置計時器
	 */
	function debounce(func, wait)
	{
		let timeout;
		return function ()
		{
			const context = this;
			const args = arguments;
			clearTimeout(timeout);
			timeout = setTimeout(() => func.apply(context, args), wait);
		};
	}

	/**
	 * 節流函數 - 限制執行頻率，在指定時間內只執行一次
	 */
	function throttle(func, wait)
	{
		let lastTime = 0;
		return function ()
		{
			const now = Date.now();
			if (now - lastTime >= wait)
			{
				lastTime = now;
				func.apply(this, arguments);
			}
		};
	}

	/**
	 * 滾動到指定元素
	 */
	function scrollToElement(element)
	{
		// 兼容 NodeList 和單一元素
		if (element)
		{
			const target = element.length ? element[0] : element;
			if (target)
			{
				// Firefox/Chrome/Edge 都支持的平滑滾動
				target.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}
	}

	/**
	 * 獲取圖片元素
	 */
	function getImages()
	{
		return document.querySelectorAll('#cp_image2, #cp_image');
	}

	/**
	 * 停止事件傳播，可選阻止默認行為
	 * @param {Event} event - 事件對象
	 * @param {boolean} [mode=false] - 是否允許默認行為
	 */
	function _uf_done(event, mode)
	{
		event.stopPropagation();
		if (!mode) event.preventDefault();
	}

// ========================================
// 主程式
// ========================================

// 只在漫畫閱讀頁面執行
if (!document.querySelector('body.vPage') && !document.querySelector('#showimage'))
{
	return;
}

let imgElements = getImages();

	// 創建頁數顯示的浮動元素
	const divPage = document.createElement('div');
	divPage.style.cssText = `
		position: absolute;
		background-color: rgba(0, 0, 0, 0.8);
		color: white;
		padding: 8px 12px;
		border-radius: 4px;
		font-size: 14px;
		z-index: 10000;
		border: 1px solid rgba(255, 255, 255, 0.2);
	`;
	document.body.appendChild(divPage);

	// 添加樣式：工具欄透明度
	document.head.insertAdjacentHTML('beforeend', `
		<style>
			.rightToolBar { opacity: 0.1; }
			.rightToolBar:hover { opacity: 1; }
		</style>
	`);

	// ========================================
	// 事件處理器
	// ========================================

	/**
	 * 滾動到當前圖片視圖
	 */
	function scrollToImage()
	{
		const imgs = getImages();
		if (imgs.length > 0)
		{
			imgs[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	/**
	 * 觸發 resize（節流）
	 */
	const emitResize = throttle(300, () => {
		handleResize();
	});

	/**
	 * 計算圖片比例
	 */
	function updateImageStyles()
	{
		imgElements = getImages();

		// 使用 _uf_fixsize2 調整每張圖片的尺寸
		if (imgElements.length > 0)
		{
			_uf_fixsize2(imgElements, window, 1);
		}

		// 更新頁數顯示
		if (typeof unsafeWindow !== 'undefined' && unsafeWindow.DM5_PAGE && unsafeWindow.DM5_IMAGE_COUNT)
		{
			divPage.textContent = `${unsafeWindow.DM5_PAGE}/${unsafeWindow.DM5_IMAGE_COUNT}`;

			// 添加錨點（用於頁面跳轉）
			if (!document.querySelector(`#showimage #ipg${unsafeWindow.DM5_PAGE + 1}`))
			{
				const showimage = document.querySelector('#showimage');
				if (showimage)
				{
					const anchor = document.createElement('a');
					anchor.id = `ipg${unsafeWindow.DM5_PAGE + 1}`;
					anchor.name = `ipg${unsafeWindow.DM5_PAGE + 1}`;
					showimage.insertBefore(anchor, showimage.firstChild);
				}
			}
		}

		// 定位頁數顯示元素到圖片左上方
		if (imgElements.length > 0)
		{
			const img = imgElements[0];
			const imgRect = img.getBoundingClientRect();
			const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
			const scrollTop = window.scrollY || document.documentElement.scrollTop;

			divPage.style.top = `${scrollTop + imgRect.top + 50}px`;
			divPage.style.left = `${scrollLeft + imgRect.left - divPage.offsetWidth}px`;
		}
	}

	/**
	 * 處理窗口大小調整（用於 resize.scroll 事件）
	 */
	function handleResizeScroll()
	{
		imgElements = getImages();

		// 設置 #showimage 容器高度
		const showimage = document.querySelector('#showimage');
		if (showimage)
		{
			showimage.style.minHeight = `${window.innerHeight}px`;
		}

		// 設置 body 樣式
		document.body.style.minWidth = 'auto';
		document.body.style.backgroundColor = '#1a1a1a';

		// 滾動到圖片
		scrollToElement(getImages());
	}

	/**
	 * 處理窗口大小調整（主處理函數）
	 */
	function handleResize()
	{
		handleResizeScroll();
		updateImageStyles();
	}

	/**
	 * 處理鍵盤導航
	 */
	function handleKeydown(event)
	{
		// 使用 keyCode 兼容不同瀏覽器
		const key = event.keyCode || event.which;

		// 上一頁：PageUp 或 左方向鍵
		if (key === KEYCODES.pageup || key === KEYCODES.left)
		{
			const preLinks = document.querySelectorAll('#s_pre a, a.s_pre');
			if (preLinks.length > 0)
			{
				_uf_done(event);
				preLinks[0].click();
				setTimeout(scrollToImage, 0);
			}
		}
		// 下一頁：PageDown 或 右方向鍵
		else if (key === KEYCODES.pagedown || key === KEYCODES.right)
		{
			const nextLinks = document.querySelectorAll('#s_next a, a.s_next, #last-win:visible a.view-btn-next');
			let handled = false;

			for (const link of nextLinks)
			{
				_uf_done(event);

				// 優先使用原生的 ShowNext 函數
				if (!link.classList.contains('view-btn-next') && typeof unsafeWindow !== 'undefined' && unsafeWindow.ShowNext)
				{
					unsafeWindow.ShowNext();
					setTimeout(scrollToImage, 0);
					handled = true;
					break;
				}
				else
				{
					link.click();
					handled = true;
					break;
				}
			}
		}
	}

	/**
	 * 處理圖片加載完成
	 */
	function handleImageLoad()
	{
		// 直接調用更新樣式
		updateImageStyles();
	}

	/**
	 * 計算圖片比例
	 */
	function calc_scale(width, height)
	{
		return width / height;
	}

	/**
	 * 調整圖片尺寸以適應容器
	 * @param {HTMLElement|NodeList|Array} who - 圖片元素或元素集合
	 * @param {Window|HTMLElement} [area=window] - 容器元素或 window
	 * @param {number} [force=1] - 強制模式 (0=不強制, 1=強制按高度, 2=按比例縮放)
	 * @param {Object} [scrollsize=null] - 滾動條尺寸 {width: number, height: number}
	 * @returns {NodeList|Array} 處理後的元素集合
	 */
	function _uf_fixsize2(who, area, force, scrollsize)
	{
		let elem = Array.isArray(who) || who instanceof NodeList ? who : [who];

		let ok;

		// 處理 area 參數
		if (area === true || area === who || area === elem)
		{
			scrollsize = null;
			ok = true;
		}
		else if (area)
		{
			ok = area;
		}
		else
		{
			ok = window;
		}

		// 處理 scrollsize 參數
		if (!scrollsize || ok === true || (scrollsize.width === undefined && scrollsize.height === undefined) || (!scrollsize.width && !scrollsize.height))
		{
			scrollsize = null;
		}
		else
		{
			if (scrollsize === 'auto')
			{
				scrollsize = { width: 'auto', height: 'auto' };
			}

			scrollsize.width = scrollsize.width || 0;
			scrollsize.height = scrollsize.height || 0;
		}

		elem.forEach((element) => {
			if (!(element instanceof HTMLElement)) return;

			let container = ok === true ? element : (ok instanceof HTMLElement ? ok : window);

			// 獲取圖片原始尺寸
			let w = element.naturalWidth || element.width;
			let h = element.naturalHeight || element.height;

			// 獲取容器尺寸
			let w2, h2;

			if (container === window)
			{
				w2 = window.innerWidth;
				h2 = window.innerHeight;
			}
			else
			{
				w2 = container.offsetWidth;
				h2 = container.offsetHeight;
			}

			// 處理滾動條尺寸
			if (scrollsize)
			{
				if (container === window)
				{
					w2 = scrollsize.width === 'auto' ? window.innerWidth : w2 - scrollsize.width;
					h2 = scrollsize.height === 'auto' ? window.innerHeight : h2 - scrollsize.height;
				}
				else
				{
					w2 = scrollsize.width === 'auto' ? container.clientWidth : w2 - scrollsize.width;
					h2 = scrollsize.height === 'auto' ? container.clientHeight : h2 - scrollsize.height;
				}
			}

			let w3 = w;
			let h3 = h;

			// 計算調整後的尺寸
			if (w > w2)
			{
				// 寬度超過容器，按寬度縮放
				w3 = w2;
				h3 = h * (w2 / w);

				if (h3 > h2)
				{
					// 高度也超過容器，按高度再縮放
					w3 = w3 * (h2 / h3);
					h3 = h2;
				}
			}
			else if (force > 1)
			{
				// 強制按比例縮放
				let scale = calc_scale(w, h);
				w3 = w3 * scale;
				h3 = h2;
			}
			else if (force || (h > h2))
			{
				// 強制模式或高度超過容器，按高度縮放
				w3 = w * (h2 / h);
				h3 = h2;

				if (w3 > w2)
				{
					// 寬度超過容器，按寬度再縮放
					w3 = w2;
					h3 = h * (w2 / w);
				}
			}

			// 設置圖片尺寸
			element.style.width = `${w3}px`;
			element.style.height = `${h3}px`;

			// 保存數據屬性
			element.dataset.naturalWidth = w;
			element.dataset.naturalHeight = h;
			element.dataset.width = w3;
			element.dataset.height = h3;
		});

		return elem;
	}

	/**
	 * 處理圖片點擊（觸發下一頁）
	 */
	function handleImageClick(event)
	{
		// 阻止圖片默認行為和事件傳播
		_uf_done(event);

		// 模擬 PageDown 鍵盤事件（使用正確的事件對象）
		const keydownEvent = new KeyboardEvent('keydown', {
			key: 'PageDown',
			keyCode: KEYCODES.pagedown,
			which: KEYCODES.pagedown,
			bubbles: true,
			cancelable: true
		});

		document.dispatchEvent(keydownEvent);
	}

	// ========================================
	// DOM 監控
	// ========================================

	/**
	 * 使用 MutationObserver 等待圖片元素出現
	 */
	function waitForImages()
	{
		return new Promise((resolve, reject) => {
			imgElements = getImages();

			// 如果圖片已存在，直接返回
			if (imgElements.length > 0)
			{
				resolve(imgElements);
				return;
			}

			// 使用 MutationObserver 監聽 #showimage 的 DOM 變化
			const observer = new MutationObserver((mutations, obs) => {
				imgElements = getImages();
				if (imgElements.length > 0)
				{
					obs.disconnect();
					resolve(imgElements);
				}
			});

			// 監聽 #showimage 的 DOM 變化
			const showimage = document.querySelector('#showimage');
			if (showimage)
			{
				observer.observe(showimage, {
					childList: true,
					subtree: true
				});
			}
			else
			{
				// 如果 #showimage 不存在，監聽 body
				observer.observe(document.body, {
					childList: true,
					subtree: true
				});
			}

			// 設置超時，避免永久等待
			setTimeout(() => {
				observer.disconnect();
				reject(imgElements);
			}, 5000);
		}).then(initImages).catch(() => console.error('Failed to load images'));
	}

	// ========================================
	// 初始化圖片元素
	// ========================================

	/**
	 * 初始化圖片：移除右鍵限制，添加事件監聽
	 */
	function initImages()
	{
		imgElements.forEach(img => {
			img.removeAttribute('oncontextmenu');
			img.addEventListener('load', handleImageLoad);
			img.addEventListener('click', handleImageClick);
		});
	}

	/**
	 * 主要的圖片初始化邏輯
	 */
	function dm5()
	{
		waitForImages().then(() => {
			updateImageStyles();
		});
	}

// ========================================
// 事件監聽器綁定
// ========================================

// 窗口事件
window.addEventListener('resize', handleResize);
window.addEventListener('load', dm5);

// 鍵盤事件
window.addEventListener('keydown', handleKeydown);

// 監聽 #showimage DOM 變化（優化版）
const showimageObserver = new MutationObserver((mutations) => {
	// 檢查是否有與圖片相關的實際變化
	let hasImageChanges = false;

	for (const mutation of mutations)
	{
		// 只檢查添加的節點中是否包含圖片
		if (mutation.type === 'childList')
		{
			for (const node of mutation.addedNodes)
			{
				if (node.nodeType === Node.ELEMENT_NODE)
				{
					// 檢查是否為圖片元素或包含圖片
					if (node.id === 'cp_image' || node.id === 'cp_image2' ||
						node.tagName === 'IMG' ||
						node.querySelector?.('#cp_image, #cp_image2, img'))
					{
						hasImageChanges = true;
						break;
					}
				}
			}
		}

		if (hasImageChanges) break;
	}

	// 只有在有圖片相關變化時才執行
	if (hasImageChanges)
	{
		dm5();
		updateImageStyles();
		setTimeout(emitResize, 300);
	}
});

const showimage = document.querySelector('#showimage');
if (showimage)
{
	// 只監聽子節點變化，不監聽屬性變化以提升性能
	showimageObserver.observe(showimage, {
		childList: true,
		subtree: true
	});
}

// 初始化執行
// 使用 requestAnimationFrame 確保 DOM 準備好
requestAnimationFrame(() => {
	dm5();
	updateImageStyles();
});

})();
