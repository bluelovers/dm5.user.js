// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      2026-01-10
// @description  try to take over the world!
// @author       You
// @match        https://www.dm5.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=dm5.com
// @grant        none
// ==/UserScript==

(function ()
{
	'use strict';

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
		if (element && element.length > 0)
		{
			element[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
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
	 * 觸發 resize 事件（節流）
	 */
	const emitResize = throttle(300, () => {
		window.dispatchEvent(new Event('resize'));
	});

	/**
	 * 更新圖片樣式和頁數顯示
	 */
	function updateImageStyles()
	{
		imgElements = getImages();

		// 設置圖片響應式樣式
		imgElements.forEach(img => {
			img.style.maxWidth = '100%';
			img.style.height = 'auto';
		});

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
	 * 處理窗口大小調整
	 */
	function handleResize()
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
	 * 處理鍵盤導航
	 */
	function handleKeydown(event)
	{
		const keycodes = { pageup: 33, left: 37, pagedown: 34, right: 39 };
		const key = event.which;

		if ([keycodes.pageup, keycodes.left].includes(key))
		{
			// 上一頁
			const preLinks = document.querySelectorAll('#s_pre a, a.s_pre');
			if (preLinks.length > 0)
			{
				_uf_done(event);
				preLinks[0].click();
				setTimeout(scrollToImage, 0);
			}
		}
		else if ([keycodes.pagedown, keycodes.right].includes(key))
		{
			// 下一頁
			const nextLinks = document.querySelectorAll('#s_next a, a.s_next, #last-win:visible a.view-btn-next');
			for (const link of nextLinks)
			{
				_uf_done(event);

				// 優先使用原生的 ShowNext 函數
				if (!link.classList.contains('view-btn-next') && typeof unsafeWindow !== 'undefined' && unsafeWindow.ShowNext)
				{
					unsafeWindow.ShowNext();
					setTimeout(scrollToImage, 0);
				}
				else
				{
					link.click();
				}
				break;
			}
		}

		setTimeout(emitResize, 300);
	}

	/**
	 * 處理圖片加載完成
	 */
	function handleImageLoad()
	{
		window.dispatchEvent(new Event('load.imagesLoaded'));
	}

	/**
	 * 處理圖片點擊（觸發下一頁）
	 */
	function handleImageClick()
	{
		const event = new KeyboardEvent('keydown', { which: 34, keyCode: 34 });
		document.querySelectorAll('input').forEach(input => input.dispatchEvent(event));
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
	 * 等待並初始化圖片
	 */
	function waitForImages()
	{
		return new Promise((resolve, reject) => {
			let count = 0;
			const checkInterval = setInterval(() => {
				imgElements = getImages();

				if (imgElements.length > 0)
				{
					clearInterval(checkInterval);
					resolve(imgElements);
				}

				if (count++ > 50)
				{
					clearInterval(checkInterval);
					reject(imgElements);
				}
			}, 100);
		}).then(initImages).catch(() => console.error('Failed to load images'));
	}

	/**
	 * 主要的圖片初始化邏輯
	 */
	function dm5()
	{
		waitForImages().then(() => {
			window.dispatchEvent(new Event('load.imagesLoaded'));
		});
	}

	// ========================================
	// 事件監聽器綁定
	// ========================================

	// 窗口事件
	window.addEventListener('resize.scroll', handleResize);
	window.addEventListener('resize.imagesLoaded', updateImageStyles);
	window.addEventListener('load', dm5);
	window.addEventListener('load.imagesLoaded', () => {
		window.dispatchEvent(new Event('load.nocontextmenu'));
		window.dispatchEvent(new Event('resize'));
	});
	window.addEventListener('keydown.page', handleKeydown);

	// 監聽 #showimage DOM 變化
	const showimageObserver = new MutationObserver(() => {
		dm5();
		window.dispatchEvent(new Event('load.imagesLoaded'));
		setTimeout(emitResize, 300);
	});

	const showimage = document.querySelector('#showimage');
	if (showimage)
	{
		showimageObserver.observe(showimage, { childList: true, subtree: true });
	}

	// 初始化執行
	dm5();
	window.dispatchEvent(new Event('load.imagesLoaded'));

})();
