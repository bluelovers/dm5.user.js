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

	function scrollToElement(element)
	{
		if (element && element.length > 0)
		{
			element[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	const imgSelector = '#cp_image2:visible, #cp_image:visible';

	if (document.querySelector('body.vPage') || document.querySelector('#showimage'))
	{
		let imgElements = document.querySelectorAll(imgSelector);
		let divPage = document.createElement('div');
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

		const style = document.createElement('style');
		style.textContent = `
			.rightToolBar { opacity: 0.1; }
			.rightToolBar:hover { opacity: 1; }
		`;
		document.head.appendChild(style);

		function scrollToImage()
		{
			const imgs = document.querySelectorAll(imgSelector);
			const showimage = document.querySelector('#showimage');
			const cpImg = document.querySelector('#cp_img');
			if (imgs.length > 0)
			{
				imgs[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
			}
		}

		const emitResize = throttle(300, () => {
			window.dispatchEvent(new Event('resize'));
		});

		window.addEventListener('resize.scroll', () => {
			imgElements = document.querySelectorAll(imgSelector);

			const showimage = document.querySelector('#showimage');
			if (showimage)
			{
				showimage.style.minHeight = window.innerHeight + 'px';
			}

			document.body.style.minWidth = 'auto';
			document.body.style.backgroundColor = '#1a1a1a';

			scrollToElement(document.querySelectorAll(imgSelector));
		});

		window.addEventListener('resize.imagesLoaded', () => {
			imgElements = document.querySelectorAll(imgSelector);

			imgElements.forEach(img => {
				img.style.maxWidth = '100%';
				img.style.height = 'auto';
			});

			if (typeof unsafeWindow !== 'undefined' && unsafeWindow.DM5_PAGE && unsafeWindow.DM5_IMAGE_COUNT)
			{
				divPage.textContent = unsafeWindow.DM5_PAGE + '/' + unsafeWindow.DM5_IMAGE_COUNT;

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

			if (imgElements.length > 0)
			{
				const img = imgElements[0];
				const imgRect = img.getBoundingClientRect();
				const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
				const scrollTop = window.scrollY || document.documentElement.scrollTop;

				divPage.style.top = (scrollTop + imgRect.top + 50) + 'px';
				divPage.style.left = (scrollLeft + imgRect.left - divPage.offsetWidth) + 'px';
			}
		});

		window.addEventListener('load', () => {
			dm5();
		});

		window.addEventListener('load.imagesLoaded', () => {
			window.dispatchEvent(new Event('load.nocontextmenu'));
			window.dispatchEvent(new Event('resize'));
		});

		window.addEventListener('keydown.page', (event) => {
			const keycodes = {
				'pageup': 33,
				'left': 37,
				'pagedown': 34,
				'right': 39
			};

			switch (event.which)
			{
				case keycodes.pageup:
				case keycodes.left:
					{
						const preLinks = document.querySelectorAll('#s_pre a, a.s_pre');
						if (preLinks.length > 0)
						{
							event.preventDefault();
							event.stopPropagation();
							preLinks[0].click();
							setTimeout(scrollToImage, 0);
						}
					}
					break;
				case keycodes.pagedown:
				case keycodes.right:
					{
						const nextLinks = document.querySelectorAll('#s_next a, a.s_next, #last-win:visible a.view-btn-next');
						let clicked = false;
						for (let link of nextLinks)
						{
							if (!link.classList.contains('view-btn-next') && typeof unsafeWindow !== 'undefined' && unsafeWindow.ShowNext)
							{
								event.preventDefault();
								event.stopPropagation();
								unsafeWindow.ShowNext();
								setTimeout(scrollToImage, 0);
								clicked = true;
								break;
							}
							else
							{
								event.preventDefault();
								event.stopPropagation();
								link.click();
								clicked = true;
								break;
							}
						}
					}
					break;
			}

			setTimeout(emitResize, 300);
		});

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

		function dm5()
		{
			return new Promise((resolve, reject) => {
				const checkInterval = setInterval(() => {
					imgElements = document.querySelectorAll(imgSelector);

					if (imgElements.length > 0)
					{
						clearInterval(checkInterval);
						resolve(imgElements);
					}
				}, 100);

				setTimeout(() => {
					clearInterval(checkInterval);
					reject(imgElements);
				}, 5000);
			}).then(imgElements => {
				imgElements.forEach(img => {
					img.removeAttribute('oncontextmenu');

					img.removeEventListener('load', handleImageLoad);
					img.addEventListener('load', handleImageLoad);

					img.removeEventListener('click', handleImageClick);
					img.addEventListener('click', handleImageClick);
				});

				window.dispatchEvent(new Event('load.imagesLoaded'));
			}).catch(() => {
				console.error('Failed to load images');
			});
		}

		function handleImageLoad()
		{
			window.dispatchEvent(new Event('load.imagesLoaded'));
		}

		function handleImageClick()
		{
			const event = new KeyboardEvent('keydown', {
				which: 34,
				keyCode: 34
			});
			document.querySelectorAll('input').forEach(input => {
				input.dispatchEvent(event);
			});
		}

		dm5();
		window.dispatchEvent(new Event('load.imagesLoaded'));
	}
})();
