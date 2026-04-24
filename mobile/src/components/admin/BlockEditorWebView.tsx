import { useCallback, useMemo, useRef, useState } from 'react';
import { View, Pressable } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/Text';
import { MediaGridPicker, type MediaGridPickerRef } from './MediaGridPicker';
import type { EditorBlock, EditorDoc, Media } from '@/lib/api/admin-types';
import { semantic, greenman } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { radii } from '@/theme/radii';

type Props = {
  label?: string;
  value: EditorDoc | null;
  onChange: (next: EditorDoc) => void;
  /** Высота редактора. По умолчанию 420. */
  height?: number;
};

function buildHtml(initialBlocks: EditorBlock[]): string {
  const initialJson = JSON.stringify(initialBlocks).replace(/<\//g, '<\\/');
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  html, body { margin: 0; padding: 0; background: #fff; color: #0f1a12;
    font-family: -apple-system, BlinkMacSystemFont, 'Manrope', 'Segoe UI', Roboto, sans-serif;
    font-size: 16px; line-height: 1.55; -webkit-text-size-adjust: 100%; }
  #editor { padding: 12px 14px 80px; outline: none; min-height: 100%; }
  .block { margin: 10px 0; outline: none; }
  .block[data-type="h2"] { font-size: 26px; line-height: 1.25; font-weight: 700; letter-spacing: -0.3px; }
  .block[data-type="h3"] { font-size: 20px; line-height: 1.3; font-weight: 700; }
  .block[data-type="paragraph"] { font-size: 17px; line-height: 1.6; }
  .block[data-type="quote"] { border-left: 3px solid #007d38; padding: 6px 12px; color: #0f1a12; font-style: italic; }
  .block[data-type="code"] { background: #0f1a12; color: #e8f6ee; border-radius: 10px; padding: 10px 12px;
    font-family: ui-monospace, Menlo, Monaco, 'Courier New', monospace; font-size: 14px; white-space: pre-wrap; word-break: break-word; }
  .block[data-type="delimiter"] { text-align: center; color: #9aa09b; font-weight: 700; letter-spacing: 6px; user-select: none; -webkit-user-select: none; }
  .block ul, .block ol { margin: 0; padding-left: 22px; }
  .block li { font-size: 17px; line-height: 1.55; margin: 2px 0; }
  .block.image { margin: 14px 0; }
  .block.image .image-wrap { position: relative; border-radius: 12px; overflow: hidden; background: #f7f8f6; }
  .block.image img { display: block; width: 100%; height: auto; }
  .block.image .image-caption { font-size: 13px; color: #5b6360; padding: 6px 4px 0; outline: none; min-height: 20px; }
  .block.image .image-caption:empty::before { content: attr(data-placeholder); color: #9aa09b; }
  .block[contenteditable="true"]:empty::before { content: attr(data-placeholder); color: #9aa09b; pointer-events: none; }
  .block.selected { box-shadow: 0 0 0 2px rgba(0,125,56,0.18); border-radius: 10px; }
  .block-handle { position: absolute; right: 6px; top: 6px; display: none; background: rgba(0,0,0,0.6); color: #fff;
    border-radius: 999px; width: 26px; height: 26px; align-items: center; justify-content: center; font-size: 14px; }
  .wrap { position: relative; }
  .wrap.selected .block-handle { display: flex; }
</style>
</head>
<body>
<div id="editor" contenteditable="false"></div>
<script>
(function() {
  const editor = document.getElementById('editor');
  let selectedIndex = -1;

  function send(msg) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(msg));
    }
  }

  function emit() {
    const blocks = serialize();
    send({ type: 'change', blocks });
  }

  function makeContentEditable(node) {
    node.setAttribute('contenteditable', 'true');
  }

  function createBlock(b, index) {
    const wrap = document.createElement('div');
    wrap.className = 'wrap';
    wrap.dataset.index = String(index);

    const block = document.createElement('div');
    block.className = 'block';
    block.dataset.type = b.type === 'header' ? ('h' + (b.data.level || 2)) : (b.type === 'image' ? 'image' : b.type);
    if (b.type === 'image') block.classList.add('image');

    if (b.type === 'paragraph') {
      block.dataset.placeholder = 'Начните писать…';
      block.innerText = b.data.text || '';
      makeContentEditable(block);
    } else if (b.type === 'header') {
      block.dataset.placeholder = (b.data.level === 3 ? 'Подзаголовок' : 'Заголовок');
      block.innerText = b.data.text || '';
      makeContentEditable(block);
    } else if (b.type === 'quote') {
      block.dataset.placeholder = 'Цитата';
      block.innerText = b.data.text || '';
      makeContentEditable(block);
    } else if (b.type === 'code') {
      block.dataset.placeholder = 'Код';
      block.innerText = b.data.code || '';
      makeContentEditable(block);
    } else if (b.type === 'delimiter') {
      block.innerText = '* * *';
      block.setAttribute('contenteditable', 'false');
    } else if (b.type === 'list') {
      const tag = (b.data.style === 'ordered') ? 'ol' : 'ul';
      const listEl = document.createElement(tag);
      const items = Array.isArray(b.data.items) && b.data.items.length ? b.data.items : [''];
      items.forEach((it) => {
        const li = document.createElement('li');
        li.innerText = typeof it === 'string' ? it : (it.content || '');
        listEl.appendChild(li);
      });
      block.appendChild(listEl);
      block.dataset.listStyle = b.data.style || 'unordered';
      makeContentEditable(block);
    } else if (b.type === 'image') {
      const imgWrap = document.createElement('div');
      imgWrap.className = 'image-wrap';
      const img = document.createElement('img');
      img.src = b.data.url || '';
      img.dataset.mediaId = String(b.data.mediaId || 0);
      imgWrap.appendChild(img);
      block.appendChild(imgWrap);
      const cap = document.createElement('div');
      cap.className = 'image-caption';
      cap.setAttribute('contenteditable', 'true');
      cap.dataset.placeholder = 'Подпись к изображению';
      cap.innerText = b.data.caption || '';
      block.appendChild(cap);
    }

    const handle = document.createElement('div');
    handle.className = 'block-handle';
    handle.innerHTML = '✕';
    handle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      removeBlockAt(Number(wrap.dataset.index));
    });
    wrap.appendChild(block);
    wrap.appendChild(handle);

    wrap.addEventListener('click', function() {
      setSelected(Number(wrap.dataset.index));
    });

    return wrap;
  }

  function render(blocks) {
    editor.innerHTML = '';
    (blocks || []).forEach(function(b, i) {
      editor.appendChild(createBlock(b, i));
    });
    if (!editor.children.length) {
      const seed = createBlock({ type: 'paragraph', data: { text: '' } }, 0);
      editor.appendChild(seed);
    }
    reindex();
  }

  function reindex() {
    Array.prototype.forEach.call(editor.children, function(wrap, i) {
      wrap.dataset.index = String(i);
    });
  }

  function setSelected(i) {
    selectedIndex = i;
    Array.prototype.forEach.call(editor.children, function(wrap, idx) {
      wrap.classList.toggle('selected', idx === i);
      const b = wrap.querySelector('.block');
      if (b) b.classList.toggle('selected', idx === i);
    });
  }

  function removeBlockAt(i) {
    const child = editor.children[i];
    if (!child) return;
    editor.removeChild(child);
    reindex();
    emit();
  }

  function serialize() {
    const out = [];
    Array.prototype.forEach.call(editor.children, function(wrap) {
      const block = wrap.querySelector('.block');
      if (!block) return;
      const type = block.dataset.type;
      if (type === 'h2' || type === 'h3') {
        out.push({ type: 'header', data: { text: (block.innerText || '').trim(), level: type === 'h2' ? 2 : 3 } });
      } else if (type === 'paragraph') {
        out.push({ type: 'paragraph', data: { text: (block.innerText || '').trim() } });
      } else if (type === 'quote') {
        out.push({ type: 'quote', data: { text: (block.innerText || '').trim() } });
      } else if (type === 'code') {
        out.push({ type: 'code', data: { code: block.innerText || '' } });
      } else if (type === 'delimiter') {
        out.push({ type: 'delimiter', data: {} });
      } else if (type === 'list') {
        const tag = block.querySelector('ol') ? 'ordered' : 'unordered';
        const lis = block.querySelectorAll('li');
        const items = Array.prototype.map.call(lis, function(li) { return (li.innerText || '').trim(); }).filter(Boolean);
        out.push({ type: 'list', data: { style: tag, items: items.length ? items : [''] } });
      } else if (type === 'image') {
        const img = block.querySelector('img');
        const cap = block.querySelector('.image-caption');
        out.push({
          type: 'image',
          data: {
            mediaId: Number((img && img.dataset.mediaId) || 0),
            url: (img && img.src) || '',
            caption: (cap && cap.innerText || '').trim(),
          },
        });
      }
    });
    return out;
  }

  function insertAfterSelected(block) {
    const atIdx = selectedIndex >= 0 ? selectedIndex + 1 : editor.children.length;
    const wrap = createBlock(block, atIdx);
    if (atIdx >= editor.children.length) {
      editor.appendChild(wrap);
    } else {
      editor.insertBefore(wrap, editor.children[atIdx]);
    }
    reindex();
    setSelected(atIdx);
    emit();
  }

  function setSelectedBlockType(newType) {
    if (selectedIndex < 0) return;
    const wrap = editor.children[selectedIndex];
    if (!wrap) return;
    const oldBlock = wrap.querySelector('.block');
    if (!oldBlock) return;
    const text = (oldBlock.innerText || '').trim();
    let next;
    if (newType === 'h2') next = { type: 'header', data: { text: text, level: 2 } };
    else if (newType === 'h3') next = { type: 'header', data: { text: text, level: 3 } };
    else if (newType === 'paragraph') next = { type: 'paragraph', data: { text: text } };
    else if (newType === 'quote') next = { type: 'quote', data: { text: text } };
    else if (newType === 'code') next = { type: 'code', data: { code: text } };
    else if (newType === 'ul') next = { type: 'list', data: { style: 'unordered', items: text ? [text] : [''] } };
    else if (newType === 'ol') next = { type: 'list', data: { style: 'ordered', items: text ? [text] : [''] } };
    else return;
    const replacement = createBlock(next, selectedIndex);
    editor.replaceChild(replacement, wrap);
    reindex();
    setSelected(selectedIndex);
    emit();
  }

  // Bridge: receive commands from RN
  function onNativeMessage(e) {
    try {
      const payload = JSON.parse(e.data || '{}');
      if (payload.type === 'init') {
        render(payload.blocks || []);
      } else if (payload.type === 'insert') {
        insertAfterSelected(payload.block);
      } else if (payload.type === 'transform') {
        setSelectedBlockType(payload.blockType);
      } else if (payload.type === 'addBlock') {
        insertAfterSelected(payload.block);
      }
    } catch (err) {}
  }
  // iOS and Android use different mechanisms; on RN WebView, injected global onMessage works via window event listener
  document.addEventListener('message', onNativeMessage);
  window.addEventListener('message', onNativeMessage);

  editor.addEventListener('input', function() { emit(); });
  editor.addEventListener('blur', function() { emit(); }, true);

  // Initial render
  render(${initialJson});
  send({ type: 'ready' });
})();
</script>
</body>
</html>`;
}

export function BlockEditorWebView({ label, value, onChange, height = 420 }: Props) {
  const webRef = useRef<WebView>(null);
  const pickerRef = useRef<MediaGridPickerRef>(null);
  const [ready, setReady] = useState(false);

  const html = useMemo(() => buildHtml(value?.blocks ?? []), []);

  const post = useCallback((msg: Record<string, unknown>) => {
    webRef.current?.postMessage(JSON.stringify(msg));
  }, []);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(e.nativeEvent.data || '{}');
        if (msg.type === 'ready') {
          setReady(true);
          post({ type: 'init', blocks: value?.blocks ?? [] });
        } else if (msg.type === 'change') {
          onChange({ blocks: msg.blocks as EditorBlock[] });
        }
      } catch {
        /* ignore */
      }
    },
    [onChange, post, value]
  );

  const insertBlock = (block: EditorBlock) => post({ type: 'addBlock', block });
  const transform = (blockType: string) => post({ type: 'transform', blockType });

  const onMediaSelected = (media: Media) => {
    insertBlock({
      type: 'image',
      data: { mediaId: media.id, url: media.url, caption: '' },
    });
  };

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? (
        <Text
          style={{
            fontFamily: 'Manrope_600SemiBold',
            fontSize: 12,
            color: semantic.inkDim,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 6,
          paddingVertical: spacing.xs,
        }}
      >
        <ToolButton icon="text" label="Абзац" onPress={() => transform('paragraph')} />
        <ToolButton icon="menu" label="H2" onPress={() => transform('h2')} />
        <ToolButton icon="list" label="H3" onPress={() => transform('h3')} />
        <ToolButton icon="list-outline" label="• список" onPress={() => transform('ul')} />
        <ToolButton icon="list-sharp" label="1. список" onPress={() => transform('ol')} />
        <ToolButton icon="chatbox-outline" label="Цитата" onPress={() => transform('quote')} />
        <ToolButton icon="code-slash" label="Код" onPress={() => transform('code')} />
        <ToolButton
          icon="remove"
          label="Разделитель"
          onPress={() => insertBlock({ type: 'delimiter', data: {} })}
        />
        <ToolButton
          icon="image-outline"
          label="Фото"
          onPress={() => pickerRef.current?.present()}
        />
        <ToolButton
          icon="add"
          label="Абзац"
          onPress={() => insertBlock({ type: 'paragraph', data: { text: '' } })}
        />
      </View>

      <View
        style={{
          height,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: semantic.border,
          overflow: 'hidden',
          backgroundColor: semantic.surface,
        }}
      >
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html }}
          onMessage={onMessage}
          keyboardDisplayRequiresUserAction={false}
          hideKeyboardAccessoryView={false}
          automaticallyAdjustContentInsets={false}
          javaScriptEnabled
          style={{ flex: 1, backgroundColor: semantic.surface }}
        />
      </View>

      {!ready ? (
        <Text
          style={{
            fontFamily: 'Manrope_500Medium',
            fontSize: 12,
            color: semantic.inkMuted,
          }}
        >
          Загрузка редактора…
        </Text>
      ) : null}

      <MediaGridPicker ref={pickerRef} accept="image" onSelect={onMediaSelected} />
    </View>
  );
}

function ToolButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: radii.full,
        backgroundColor: semantic.surfaceSunken,
      }}
    >
      <Ionicons name={icon} size={14} color={greenman[7]} />
      <Text
        style={{
          fontFamily: 'Manrope_600SemiBold',
          fontSize: 12,
          color: semantic.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
