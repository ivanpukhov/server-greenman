import React from 'react';
import { View, Text, Image, Linking, Pressable } from 'react-native';

type Block = { type: string; data: any };
type Doc = { blocks?: Block[] } | Block[] | string | null | undefined;

function parse(doc: Doc): Block[] {
  if (!doc) return [];
  if (typeof doc === 'string') {
    try { return parse(JSON.parse(doc)); } catch { return []; }
  }
  if (Array.isArray(doc)) return doc as Block[];
  if ((doc as any).blocks) return (doc as any).blocks as Block[];
  return [];
}

function stripHtml(s: string): string {
  return String(s || '').replace(/<[^>]+>/g, '');
}

export default function BlockRenderer({ blocks }: { blocks: Doc }) {
  const parsed = parse(blocks);
  return (
    <View className="gap-3">
      {parsed.map((b, i) => <BlockView key={i} block={b} />)}
    </View>
  );
}

function BlockView({ block }: { block: Block }) {
  const { type, data } = block || {};
  if (!type) return null;
  switch (type) {
    case 'header': {
      const level = Math.min(Math.max(parseInt(data?.level || 2, 10), 1), 6);
      const size = [28, 24, 20, 18, 16, 14][level - 1];
      return <Text style={{ fontSize: size, fontWeight: '700' }}>{stripHtml(data?.text || '')}</Text>;
    }
    case 'paragraph':
      return <Text style={{ fontSize: 16, lineHeight: 22 }}>{stripHtml(data?.text || '')}</Text>;
    case 'quote':
      return (
        <View style={{ borderLeftWidth: 3, borderLeftColor: '#999', paddingLeft: 12 }}>
          <Text style={{ fontStyle: 'italic', fontSize: 16 }}>{stripHtml(data?.text || '')}</Text>
          {data?.caption ? <Text style={{ color: '#777', marginTop: 4 }}>— {stripHtml(data.caption)}</Text> : null}
        </View>
      );
    case 'list': {
      const items = Array.isArray(data?.items) ? data.items : [];
      return (
        <View>
          {items.map((it: any, i: number) => (
            <Text key={i} style={{ fontSize: 16, lineHeight: 22 }}>
              {data?.style === 'ordered' ? `${i + 1}. ` : '• '}
              {stripHtml(typeof it === 'string' ? it : it?.content || '')}
            </Text>
          ))}
        </View>
      );
    }
    case 'delimiter':
      return <View style={{ height: 1, backgroundColor: '#ddd', marginVertical: 8 }} />;
    case 'image': {
      const url = data?.file?.url || data?.url;
      if (!url) return null;
      return (
        <View>
          <Image source={{ uri: url }} style={{ width: '100%', height: 220, borderRadius: 8 }} resizeMode="cover" />
          {data?.caption ? <Text style={{ color: '#666', marginTop: 4 }}>{stripHtml(data.caption)}</Text> : null}
        </View>
      );
    }
    case 'video': {
      const url = data?.file?.url || data?.url;
      if (!url) return null;
      return (
        <Pressable onPress={() => Linking.openURL(url)}>
          <View style={{ padding: 12, backgroundColor: '#f3f3f3', borderRadius: 8 }}>
            <Text>▶ Видео: открыть</Text>
            {data?.caption ? <Text style={{ color: '#666', marginTop: 4 }}>{stripHtml(data.caption)}</Text> : null}
          </View>
        </Pressable>
      );
    }
    case 'attaches': {
      const url = data?.file?.url;
      if (!url) return null;
      return (
        <Pressable onPress={() => Linking.openURL(url)}>
          <Text style={{ color: '#1a56db' }}>📎 {data?.title || data?.file?.name || 'Файл'}</Text>
        </Pressable>
      );
    }
    case 'code':
      return (
        <View style={{ backgroundColor: '#f6f6f6', padding: 12, borderRadius: 6 }}>
          <Text style={{ fontFamily: 'Courier' }}>{String(data?.code || '')}</Text>
        </View>
      );
    case 'warning':
      return (
        <View style={{ backgroundColor: '#fff4e5', padding: 12, borderRadius: 8 }}>
          <Text style={{ fontWeight: '700' }}>{stripHtml(data?.title || 'Внимание')}</Text>
          <Text>{stripHtml(data?.message || '')}</Text>
        </View>
      );
    case 'embed':
      return (
        <Pressable onPress={() => data?.source && Linking.openURL(data.source)}>
          <Text style={{ color: '#1a56db' }}>🔗 {data?.caption || data?.source || 'Embed'}</Text>
        </Pressable>
      );
    default:
      return <Text style={{ color: '#999' }}>[{type}]</Text>;
  }
}
