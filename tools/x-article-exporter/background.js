'use strict';

chrome.action.onClicked.addListener(async tab => {
  if (!tab.id) return;
  try {
    const url = new URL(tab.url || '');
    if (!/(^|\.)(x\.com|twitter\.com)$/.test(url.hostname)) throw new Error('请先打开 X 文章或帖子');
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['exporter.js', 'run-export.js'],
    });
    const success = results[0]?.result?.ok;
    await chrome.action.setBadgeText({ tabId: tab.id, text: success ? 'OK' : '!' });
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: success ? '#176148' : '#9d491f' });
    await chrome.action.setTitle({ tabId: tab.id, title: success ? '导出完成；详情见页面右下角' : '请查看页面右下角的提示' });
  } catch (error) {
    await chrome.action.setBadgeText({ tabId: tab.id, text: '!' });
    await chrome.action.setTitle({ tabId: tab.id, title: error.message || '无法导出，请刷新 X 详情页后重试' });
  }
});
